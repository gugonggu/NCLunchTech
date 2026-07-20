import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { AppointmentStatus, ParticipantStatus } from "./validation";

export interface AppointmentDetail {
  id: string;
  hostEmployeeId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantCategory: string;
  scheduledAt: string;
  memo: string | null;
  status: AppointmentStatus;
}

export async function getAppointmentDetail(appointmentId: string): Promise<AppointmentDetail | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("appointments")
    .select("id, host_employee_id, restaurant_id, scheduled_at, memo, status, restaurants(name, category)")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const restaurant = data.restaurants as unknown as { name: string; category: string } | null;
  if (!restaurant) {
    return null;
  }

  return {
    id: data.id,
    hostEmployeeId: data.host_employee_id,
    restaurantId: data.restaurant_id,
    restaurantName: restaurant.name,
    restaurantCategory: restaurant.category,
    scheduledAt: data.scheduled_at,
    memo: data.memo,
    status: data.status as AppointmentStatus,
  };
}

export interface ParticipantRow {
  id: string;
  employeeId: string;
  employeeNickname: string;
  status: ParticipantStatus;
}

export async function getParticipants(appointmentId: string): Promise<ParticipantRow[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("appointment_participants")
    .select("id, employee_id, status, employees(nickname)")
    .eq("appointment_id", appointmentId)
    .order("created_at");

  return (data ?? []).map((row) => {
    const employee = row.employees as unknown as { nickname: string } | null;
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeNickname: employee?.nickname ?? "(알 수 없음)",
      status: row.status as ParticipantStatus,
    };
  });
}

export interface MyParticipant {
  id: string;
  status: ParticipantStatus;
}

export async function getMyParticipant(
  appointmentId: string,
  employeeId: string
): Promise<MyParticipant | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("appointment_participants")
    .select("id, status")
    .eq("appointment_id", appointmentId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  return data ? { id: data.id, status: data.status as ParticipantStatus } : null;
}

/** 닉네임 목록을 정확히 일치하는 활성 직원으로 해석한다(자기 자신은 제외). */
export async function resolveEmployeesByNickname(
  nicknames: string[],
  excludeEmployeeId: string
): Promise<{ id: string; nickname: string }[]> {
  if (nicknames.length === 0) {
    return [];
  }

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("employees")
    .select("id, nickname")
    .in("nickname", nicknames)
    .eq("is_active", true);

  return (data ?? []).filter((e) => e.id !== excludeEmployeeId);
}

export interface UpcomingAppointment {
  id: string;
  restaurantName: string;
  scheduledAt: string;
  role: "host" | "participant";
  myStatus: ParticipantStatus | null;
}

/** 홈 화면 "다가오는 약속": 내가 방장이거나 대기/확정 상태로 참여 중이며 아직 시작 전인 약속. */
export async function getUpcomingAppointments(
  employeeId: string,
  now: Date
): Promise<UpcomingAppointment[]> {
  const supabase = createServiceRoleClient();

  const [{ data: hosted }, { data: participantRows }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, scheduled_at, status, restaurants(name)")
      .eq("host_employee_id", employeeId)
      .order("scheduled_at"),
    supabase
      .from("appointment_participants")
      .select("status, appointments(id, scheduled_at, status, restaurants(name))")
      .eq("employee_id", employeeId),
  ]);

  const results: UpcomingAppointment[] = [];

  for (const a of hosted ?? []) {
    const restaurant = a.restaurants as unknown as { name: string } | null;
    if (a.status === "active" && restaurant && new Date(a.scheduled_at) >= now) {
      results.push({
        id: a.id,
        restaurantName: restaurant.name,
        scheduledAt: a.scheduled_at,
        role: "host",
        myStatus: null,
      });
    }
  }

  for (const p of participantRows ?? []) {
    if (p.status !== "pending" && p.status !== "accepted") {
      continue;
    }

    const appt = p.appointments as unknown as {
      id: string;
      scheduled_at: string;
      status: string;
      restaurants: { name: string } | null;
    } | null;

    if (!appt || appt.status !== "active" || !appt.restaurants) {
      continue;
    }
    if (new Date(appt.scheduled_at) < now) {
      continue;
    }

    results.push({
      id: appt.id,
      restaurantName: appt.restaurants.name,
      scheduledAt: appt.scheduled_at,
      role: "participant",
      myStatus: p.status as ParticipantStatus,
    });
  }

  results.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  return results;
}
