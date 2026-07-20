import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { NotificationType } from "./validation";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  relatedAppointmentId: string | null;
  relatedRestaurantId: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function getUnreadNotificationCount(employeeId: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .is("read_at", null);

  return count ?? 0;
}

export async function getNotifications(employeeId: string): Promise<Notification[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, message, related_appointment_id, related_restaurant_id, read_at, created_at")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type as NotificationType,
    message: n.message,
    relatedAppointmentId: n.related_appointment_id,
    relatedRestaurantId: n.related_restaurant_id,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));
}

export async function markAllNotificationsRead(employeeId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("employee_id", employeeId)
    .is("read_at", null);
}

export async function createNotification(params: {
  employeeId: string;
  type: NotificationType;
  message: string;
  relatedAppointmentId?: string;
  relatedRestaurantId?: string;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase.from("notifications").insert({
    employee_id: params.employeeId,
    type: params.type,
    message: params.message,
    related_appointment_id: params.relatedAppointmentId ?? null,
    related_restaurant_id: params.relatedRestaurantId ?? null,
  });
}

/** 초대·변경·취소 알림 대상: 응답 대기/확정 중인 참여자(거절·불참·완료 제외). */
export async function getActiveParticipantEmployeeIds(appointmentId: string): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("appointment_participants")
    .select("employee_id")
    .eq("appointment_id", appointmentId)
    .in("status", ["pending", "accepted"]);

  return (data ?? []).map((r) => r.employee_id);
}

/** 약속 메뉴 투표 생성 알림 대상: 수락(accepted)한 참여자만(투표 가능한 사람과 동일한 범위). */
export async function getAcceptedParticipantEmployeeIds(appointmentId: string): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("appointment_participants")
    .select("employee_id")
    .eq("appointment_id", appointmentId)
    .eq("status", "accepted");

  return (data ?? []).map((r) => r.employee_id);
}
