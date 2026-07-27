import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export interface SettlementAttendee {
  employeeId: string;
  employeeNickname: string;
}

/** 완료된 약속의 실제 참석자만(방장은 host_attendance_status, 참여자는 개별 상태 기준) 반환한다. */
export async function getAttendeesForAppointment(appointmentId: string): Promise<SettlementAttendee[]> {
  const supabase = createServiceRoleClient();

  const [{ data: appointment }, { data: participants }] = await Promise.all([
    supabase
      .from("appointments")
      .select("host_employee_id, host_attendance_status, employees(nickname)")
      .eq("id", appointmentId)
      .maybeSingle(),
    supabase
      .from("appointment_participants")
      .select("employee_id, employees(nickname)")
      .eq("appointment_id", appointmentId)
      .eq("status", "completed"),
  ]);

  const attendees: SettlementAttendee[] = [];

  if (appointment?.host_attendance_status === "completed") {
    const host = appointment.employees as unknown as { nickname: string } | null;
    attendees.push({ employeeId: appointment.host_employee_id, employeeNickname: host?.nickname ?? "(알 수 없음)" });
  }

  for (const p of participants ?? []) {
    const employee = p.employees as unknown as { nickname: string } | null;
    attendees.push({ employeeId: p.employee_id, employeeNickname: employee?.nickname ?? "(알 수 없음)" });
  }

  return attendees;
}

export interface SettlementShareDetail {
  employeeId: string;
  employeeNickname: string;
  amount: number;
  isPayer: boolean;
}

export interface SettlementDetail {
  id: string;
  createdBy: string;
  payerEmployeeId: string;
  totalAmount: number;
  roundingUnit: number;
  splitMode: "equal" | "custom";
  roundingEmployeeId: string | null;
  updatedAt: string;
  shares: SettlementShareDetail[];
}

export async function getSettlementForAppointment(appointmentId: string): Promise<SettlementDetail | null> {
  const supabase = createServiceRoleClient();
  const { data: settlement } = await supabase
    .from("settlements")
    .select("id, created_by, payer_employee_id, total_amount, rounding_unit, split_mode, rounding_employee_id, updated_at")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (!settlement) {
    return null;
  }

  const { data: shares } = await supabase
    .from("settlement_shares")
    .select("employee_id, amount, is_payer, employees(nickname)")
    .eq("settlement_id", settlement.id)
    .order("is_payer", { ascending: true });

  return {
    id: settlement.id,
    createdBy: settlement.created_by,
    payerEmployeeId: settlement.payer_employee_id,
    totalAmount: settlement.total_amount,
    roundingUnit: settlement.rounding_unit,
    splitMode: settlement.split_mode as "equal" | "custom",
    roundingEmployeeId: settlement.rounding_employee_id,
    updatedAt: settlement.updated_at,
    shares: (shares ?? []).map((s) => {
      const employee = s.employees as unknown as { nickname: string } | null;
      return {
        employeeId: s.employee_id,
        employeeNickname: employee?.nickname ?? "(알 수 없음)",
        amount: s.amount,
        isPayer: s.is_payer,
      };
    }),
  };
}

/** 약속당 정산 하나만 유지한다(있으면 수정, 없으면 생성). 부담액 스냅샷은 매번 새로 계산해 덮어쓴다. */
export async function upsertSettlement(params: {
  appointmentId: string;
  createdBy: string;
  payerEmployeeId: string;
  totalAmount: number;
  roundingUnit: number;
  splitMode: "equal" | "custom";
  roundingEmployeeId: string | null;
  shares: Map<string, number>;
}): Promise<{ isNew: boolean }> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("upsert_settlement", {
    p_appointment_id: params.appointmentId,
    p_created_by: params.createdBy,
    p_payer_employee_id: params.payerEmployeeId,
    p_total_amount: params.totalAmount,
    p_rounding_unit: params.roundingUnit,
    p_split_mode: params.splitMode,
    p_rounding_employee_id: params.roundingEmployeeId,
    p_shares: [...params.shares.entries()].map(([employeeId, amount]) => ({
      employee_id: employeeId,
      amount,
      is_payer: employeeId === params.payerEmployeeId,
    })),
  }).maybeSingle();

  if (error || !data) {
    throw new Error("정산 저장에 실패했습니다.");
  }

  return { isNew: (data as { is_new: boolean }).is_new };
}
