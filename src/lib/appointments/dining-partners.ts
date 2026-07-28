import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** 동행자 id 목록에서 본인을 제외한 고유 id 집합을 만든다(순수 함수). */
export function dedupePartnerIds(rows: { partnerId: string }[], selfEmployeeId: string): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.partnerId !== selfEmployeeId) {
      ids.add(row.partnerId);
    }
  }
  return ids;
}

/**
 * 이 직원이 완료된 함께 먹기 약속에서 실제로 같이 식사한(둘 다 완료 처리한) 서로 다른 동료 수를 구한다.
 * 방장으로 완료한 약속의 완료 참여자들 + 참여자로 완료한 약속의 방장(완료 시)·다른 완료 참여자들을 합친다.
 */
export async function getUniqueDiningPartnerCount(employeeId: string): Promise<number> {
  const supabase = createServiceRoleClient();

  const [{ data: hostedAppointments }, { data: joinedParticipantRows }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id")
      .eq("host_employee_id", employeeId)
      .eq("host_attendance_status", "completed"),
    supabase
      .from("appointment_participants")
      .select("appointment_id, appointments!inner(id, host_employee_id, host_attendance_status)")
      .eq("employee_id", employeeId)
      .eq("status", "completed"),
  ]);

  const hostedAppointmentIds = (hostedAppointments ?? []).map((a) => a.id);
  const joinedAppointmentIds = (joinedParticipantRows ?? [])
    .map((row) => {
      const appt = row.appointments as unknown as { id: string; host_employee_id: string; host_attendance_status: string | null };
      return appt.host_attendance_status === "completed" ? { id: appt.id, hostId: appt.host_employee_id } : null;
    })
    .filter((v): v is { id: string; hostId: string } => v !== null);

  const partnerRows: { partnerId: string }[] = [];

  if (hostedAppointmentIds.length > 0) {
    const { data: hostedParticipants } = await supabase
      .from("appointment_participants")
      .select("employee_id")
      .in("appointment_id", hostedAppointmentIds)
      .eq("status", "completed");
    for (const row of hostedParticipants ?? []) {
      partnerRows.push({ partnerId: row.employee_id });
    }
  }

  for (const joined of joinedAppointmentIds) {
    partnerRows.push({ partnerId: joined.hostId });
  }

  if (joinedAppointmentIds.length > 0) {
    const { data: otherParticipants } = await supabase
      .from("appointment_participants")
      .select("employee_id")
      .in("appointment_id", joinedAppointmentIds.map((j) => j.id))
      .eq("status", "completed");
    for (const row of otherParticipants ?? []) {
      partnerRows.push({ partnerId: row.employee_id });
    }
  }

  return dedupePartnerIds(partnerRows, employeeId).size;
}
