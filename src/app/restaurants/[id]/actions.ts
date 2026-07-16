"use server";

import { revalidatePath } from "next/cache";
import { getCurrentEmployee } from "@/lib/auth/session";
import { logChange } from "@/lib/restaurants/change-history";
import { menuItemSchema } from "@/lib/restaurants/menu-validation";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function addMenuItem(restaurantId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    throw new Error("로그인이 필요합니다.");
  }

  const parsed = menuItemSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      restaurant_id: restaurantId,
      name: parsed.data.name,
      price: parsed.data.price,
      created_by: employee.id,
      updated_by: employee.id,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error("메뉴 추가에 실패했습니다.");
  }

  await logChange({
    entityType: "menu_item",
    entityId: data.id,
    action: "create",
    changedBy: employee.id,
    after: data,
  });

  revalidatePath(`/restaurants/${restaurantId}`);
}

export async function updateMenuPrice(menuItemId: string, restaurantId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    throw new Error("로그인이 필요합니다.");
  }

  const parsed = menuItemSchema.shape.price.safeParse(formData.get("price"));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "가격이 올바르지 않습니다.");
  }

  const supabase = createServiceRoleClient();
  const { data: before } = await supabase
    .from("menu_items")
    .select("*")
    .eq("id", menuItemId)
    .maybeSingle();

  const { data: after, error } = await supabase
    .from("menu_items")
    .update({ price: parsed.data, updated_by: employee.id, updated_at: new Date().toISOString() })
    .eq("id", menuItemId)
    .select()
    .single();

  if (error || !after) {
    throw new Error("가격 수정에 실패했습니다.");
  }

  await logChange({
    entityType: "menu_item",
    entityId: menuItemId,
    action: "update",
    changedBy: employee.id,
    before,
    after,
  });

  revalidatePath(`/restaurants/${restaurantId}`);
}

export async function toggleMenuSoldOut(menuItemId: string, restaurantId: string, nextValue: boolean) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    throw new Error("로그인이 필요합니다.");
  }

  const supabase = createServiceRoleClient();
  const { data: before } = await supabase
    .from("menu_items")
    .select("*")
    .eq("id", menuItemId)
    .maybeSingle();

  const { data: after, error } = await supabase
    .from("menu_items")
    .update({ is_sold_out: nextValue, updated_by: employee.id, updated_at: new Date().toISOString() })
    .eq("id", menuItemId)
    .select()
    .single();

  if (error || !after) {
    throw new Error("품절 상태 변경에 실패했습니다.");
  }

  await logChange({
    entityType: "menu_item",
    entityId: menuItemId,
    action: "update",
    changedBy: employee.id,
    before,
    after,
  });

  revalidatePath(`/restaurants/${restaurantId}`);
}

export async function updateRestaurantHours(restaurantId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    throw new Error("로그인이 필요합니다.");
  }

  const supabase = createServiceRoleClient();

  const { data: before } = await supabase
    .from("restaurant_hours")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("day_of_week");

  const now = new Date().toISOString();
  const rows = [];

  for (let day = 0; day <= 6; day++) {
    const isClosed = formData.get(`closed_${day}`) === "on";
    const openTime = (formData.get(`open_${day}`) as string) || null;
    const closeTime = (formData.get(`close_${day}`) as string) || null;

    rows.push({
      restaurant_id: restaurantId,
      day_of_week: day,
      is_closed: isClosed,
      open_time: isClosed ? null : openTime,
      close_time: isClosed ? null : closeTime,
      updated_by: employee.id,
      updated_at: now,
    });
  }

  const { data: after, error } = await supabase
    .from("restaurant_hours")
    .upsert(rows, { onConflict: "restaurant_id,day_of_week" })
    .select();

  if (error) {
    throw new Error("영업시간 저장에 실패했습니다.");
  }

  await logChange({
    entityType: "restaurant_hours",
    entityId: restaurantId,
    action: "update",
    changedBy: employee.id,
    before,
    after,
  });

  revalidatePath(`/restaurants/${restaurantId}`);
}
