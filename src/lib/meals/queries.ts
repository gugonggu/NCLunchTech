import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isCompletedMealSource, type MealSource } from "./validation";

export async function getCompletedMealSource(
  employeeId: string,
  restaurantId: string,
  source: MealSource
): Promise<MealSource | null> {
  const supabase = createServiceRoleClient();

  if (source.visitId) {
    const { data: visit, error } = await supabase
      .from("visits")
      .select("id, employee_id, restaurant_id, status")
      .eq("id", source.visitId)
      .maybeSingle();

    if (error) throw new Error("완료 방문 조회에 실패했습니다.");

    if (
      !visit ||
      !isCompletedMealSource(
        {
          kind: "visit",
          employeeId: visit.employee_id,
          restaurantId: visit.restaurant_id,
          status: visit.status,
        },
        employeeId,
        restaurantId
      )
    ) {
      return null;
    }
    return { visitId: visit.id };
  }

  if (!source.appointmentId) return null;

  const [appointmentResult, participantResult] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, restaurant_id, host_employee_id, host_attendance_status")
      .eq("id", source.appointmentId)
      .maybeSingle(),
    supabase
      .from("appointment_participants")
      .select("employee_id, status")
      .eq("appointment_id", source.appointmentId)
      .eq("employee_id", employeeId)
      .maybeSingle(),
  ]);
  if (appointmentResult.error || participantResult.error) {
    throw new Error("완료 약속 조회에 실패했습니다.");
  }
  const appointment = appointmentResult.data;
  const participant = participantResult.data;

  if (
    !appointment ||
    !isCompletedMealSource(
      {
        kind: "appointment",
        restaurantId: appointment.restaurant_id,
        hostEmployeeId: appointment.host_employee_id,
        hostAttendanceStatus: appointment.host_attendance_status,
        participantEmployeeId: participant?.employee_id ?? null,
        participantStatus: participant?.status ?? null,
      },
      employeeId,
      restaurantId
    )
  ) {
    return null;
  }

  return { appointmentId: appointment.id };
}

export interface MealRecord {
  id: string;
  menuItemId: string | null;
  menuName: string;
  paidPrice: number;
}

export async function getMealRecordForSource(
  employeeId: string,
  source: MealSource
): Promise<MealRecord | null> {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("meal_records")
    .select("id, menu_item_id, menu_name_snapshot, paid_price")
    .eq("employee_id", employeeId);

  query = source.visitId ? query.eq("visit_id", source.visitId) : query.eq("appointment_id", source.appointmentId!);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("메뉴 기록 조회에 실패했습니다.");

  return data
    ? {
        id: data.id,
        menuItemId: data.menu_item_id,
        menuName: data.menu_name_snapshot,
        paidPrice: data.paid_price,
      }
    : null;
}
