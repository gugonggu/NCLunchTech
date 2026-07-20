"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { parseSeoulDateTimeLocal } from "@/lib/appointments/validation";
import { MAX_POLL_OPTIONS, dedupeIds, sanitizeCustomLabels } from "@/lib/polls/validation";

function redirectToRestaurantForm(status: string): never {
  redirect(`/polls/new?type=restaurant&status=${status}`);
}

function redirectToMenuForm(restaurantId: string | undefined, status: string): never {
  const params = new URLSearchParams({ type: "menu", status });
  if (restaurantId) {
    params.set("restaurantId", restaurantId);
  }
  redirect(`/polls/new?${params.toString()}`);
}

export async function createRestaurantPoll(formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent("/polls/new?type=restaurant")}`);
  }

  const closesAt = parseSeoulDateTimeLocal(String(formData.get("closesAt") ?? ""));
  if (!closesAt || closesAt.getTime() <= Date.now()) {
    redirectToRestaurantForm("invalid_closes_at");
  }

  const restaurantIds = dedupeIds(formData.getAll("restaurantIds"));
  if (restaurantIds.length === 0) {
    redirectToRestaurantForm("too_few_options");
  }
  if (restaurantIds.length > MAX_POLL_OPTIONS) {
    redirectToRestaurantForm("too_many_options");
  }

  const supabase = createServiceRoleClient();
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id")
    .in("id", restaurantIds)
    .eq("is_active", true);

  if (!restaurants || restaurants.length !== restaurantIds.length) {
    redirectToRestaurantForm("invalid_input");
  }

  const { data: poll, error } = await supabase
    .from("polls")
    .insert({
      created_by: employee.id,
      poll_type: "restaurant",
      closes_at: closesAt.toISOString(),
    })
    .select("id")
    .single();

  if (error || !poll) {
    throw new Error("투표 생성에 실패했습니다.");
  }

  const { error: optionsError } = await supabase.from("poll_options").insert(
    restaurantIds.map((id, index) => ({
      poll_id: poll.id,
      restaurant_id: id,
      position: index,
    }))
  );

  if (optionsError) {
    throw new Error("투표 생성에 실패했습니다.");
  }

  redirect(`/polls/${poll.id}?status=created`);
}

export async function createMenuPoll(formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent("/polls/new?type=menu")}`);
  }

  const restaurantId = String(formData.get("restaurantId") ?? "").trim();
  if (!restaurantId) {
    redirectToMenuForm(undefined, "invalid_input");
  }

  const closesAt = parseSeoulDateTimeLocal(String(formData.get("closesAt") ?? ""));
  if (!closesAt || closesAt.getTime() <= Date.now()) {
    redirectToMenuForm(restaurantId, "invalid_closes_at");
  }

  const supabase = createServiceRoleClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!restaurant) {
    redirectToMenuForm(undefined, "inactive_restaurant");
  }

  const menuItemIds = dedupeIds(formData.getAll("menuItemIds"));
  const customLabels = sanitizeCustomLabels(formData.getAll("customLabels"));

  if (menuItemIds.length + customLabels.length === 0) {
    redirectToMenuForm(restaurantId, "too_few_options");
  }
  if (menuItemIds.length + customLabels.length > MAX_POLL_OPTIONS) {
    redirectToMenuForm(restaurantId, "too_many_options");
  }

  let validMenuItemIds: string[] = [];
  if (menuItemIds.length > 0) {
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id")
      .in("id", menuItemIds)
      .eq("restaurant_id", restaurantId);

    validMenuItemIds = (menuItems ?? []).map((m) => m.id);
    if (validMenuItemIds.length !== menuItemIds.length) {
      // 다른 식당 메뉴 id가 섞여 들어온 경우: 조용히 무시하지 않고 전체를 거부한다.
      redirectToMenuForm(restaurantId, "invalid_input");
    }
  }

  const { data: poll, error } = await supabase
    .from("polls")
    .insert({
      created_by: employee.id,
      poll_type: "menu",
      restaurant_id: restaurantId,
      closes_at: closesAt.toISOString(),
    })
    .select("id")
    .single();

  if (error || !poll) {
    throw new Error("투표 생성에 실패했습니다.");
  }

  let position = 0;
  const optionRows = [
    ...validMenuItemIds.map((id) => ({ poll_id: poll.id, menu_item_id: id, position: position++ })),
    ...customLabels.map((label) => ({ poll_id: poll.id, custom_label: label, position: position++ })),
  ];

  const { error: optionsError } = await supabase.from("poll_options").insert(optionRows);
  if (optionsError) {
    throw new Error("투표 생성에 실패했습니다.");
  }

  redirect(`/polls/${poll.id}?status=created`);
}
