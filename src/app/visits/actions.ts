"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { decideOutcome } from "@/lib/visits/decision";
import { getActiveVisitToday } from "@/lib/visits/queries";
import { UUID_PATTERN, getSeoulDateString, type VisitFeedbackCode } from "@/lib/visits/validation";
import { isPastConfirmationWindow } from "@/lib/confirmation-window";

function redirectWithStatus(status: VisitFeedbackCode): never {
  redirect(`/?visitStatus=${status}`);
}

/** 식당 ID 하나만 클라이언트에서 받는다. 직원과 오늘 날짜는 항상 서버에서 직접 계산한다. */
export async function decideRestaurant(restaurantId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login");
  }

  if (typeof restaurantId !== "string" || !UUID_PATTERN.test(restaurantId)) {
    redirectWithStatus("invalid_id");
  }

  const supabase = createServiceRoleClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, is_active")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant) {
    redirectWithStatus("not_found");
  }
  if (!restaurant.is_active) {
    redirectWithStatus("inactive_restaurant");
  }

  const today = getSeoulDateString(new Date());
  const active = await getActiveVisitToday(employee.id, today);

  if (active?.status === "completed") {
    redirectWithStatus("already_completed");
  }

  const existingPlanned = active?.status === "planned" ? { id: active.id, restaurantId: active.restaurantId } : null;
  const outcome = decideOutcome(existingPlanned, restaurantId);

  if (outcome.action === "already_decided") {
    redirectWithStatus("already_decided");
  }

  if (outcome.action === "update_restaurant") {
    const { error } = await supabase
      .from("visits")
      .update({ restaurant_id: restaurantId, updated_at: new Date().toISOString() })
      .eq("id", outcome.visitId)
      .eq("employee_id", employee.id)
      .eq("status", "planned");

    if (error) {
      throw new Error("결정 변경에 실패했습니다.");
    }

    redirectWithStatus("changed");
  }

  const { error: insertError } = await supabase.from("visits").insert({
    employee_id: employee.id,
    restaurant_id: restaurantId,
    visit_date: today,
    status: "planned",
  });

  if (insertError) {
    // 동시 요청으로 하루-활성-방문 고유 인덱스 충돌(23505)이 나면 다시 조회해 판단한다.
    // 이미 완료된 방문이 확인되면 변경하지 않고 already_completed로 처리한다.
    if (insertError.code === "23505") {
      const retryActive = await getActiveVisitToday(employee.id, today);

      if (retryActive?.status === "completed") {
        redirectWithStatus("already_completed");
      }

      if (retryActive?.status === "planned") {
        if (retryActive.restaurantId === restaurantId) {
          redirectWithStatus("already_decided");
        }

        const { error: retryError } = await supabase
          .from("visits")
          .update({ restaurant_id: restaurantId, updated_at: new Date().toISOString() })
          .eq("id", retryActive.id)
          .eq("employee_id", employee.id)
          .eq("status", "planned");

        if (retryError) {
          throw new Error("결정 변경에 실패했습니다.");
        }

        redirectWithStatus("changed");
      }
    }

    throw new Error("방문 결정에 실패했습니다.");
  }

  redirectWithStatus("decided");
}

export async function cancelTodayVisit() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login");
  }

  const today = getSeoulDateString(new Date());
  const active = await getActiveVisitToday(employee.id, today);

  if (!active) {
    redirectWithStatus("no_active_visit");
  }
  if (active.status === "completed") {
    redirectWithStatus("already_completed");
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("visits")
    .update({ status: "cancelled", cancelled_at: now, updated_at: now })
    .eq("id", active.id)
    .eq("employee_id", employee.id)
    .eq("status", "planned");

  if (error) {
    throw new Error("취소에 실패했습니다.");
  }

  redirectWithStatus("cancelled");
}

export async function completeTodayVisit() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login");
  }

  const today = getSeoulDateString(new Date());
  const active = await getActiveVisitToday(employee.id, today);

  if (!active) {
    redirectWithStatus("no_active_visit");
  }
  if (active.status === "completed") {
    redirectWithStatus("already_completed");
  }

  const currentTime = new Date();
  if (!isPastConfirmationWindow(new Date(active.updatedAt), currentTime)) {
    redirectWithStatus("too_early");
  }

  const supabase = createServiceRoleClient();
  const now = currentTime.toISOString();
  const { data, error } = await supabase
    .from("visits")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("id", active.id)
    .eq("employee_id", employee.id)
    .eq("status", "planned")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("방문 완료 처리에 실패했습니다.");
  }
  if (!data) {
    redirectWithStatus("already_completed");
  }

  redirectWithStatus("completed");
}

export async function markTodayVisitNoShow() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login");
  }

  const today = getSeoulDateString(new Date());
  const active = await getActiveVisitToday(employee.id, today);
  if (!active) {
    redirectWithStatus("no_active_visit");
  }
  if (active.status === "completed") {
    redirectWithStatus("already_completed");
  }

  const currentTime = new Date();
  if (!isPastConfirmationWindow(new Date(active.updatedAt), currentTime)) {
    redirectWithStatus("too_early");
  }

  const now = currentTime.toISOString();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("visits")
    .update({ status: "cancelled", cancelled_at: now, updated_at: now })
    .eq("id", active.id)
    .eq("employee_id", employee.id)
    .eq("status", "planned")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("방문 확인 처리에 실패했습니다.");
  }
  if (!data) {
    redirectWithStatus("no_active_visit");
  }

  redirectWithStatus("no_show");
}
