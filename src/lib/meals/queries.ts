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

export interface ManagedMealRecord extends MealRecord {
  restaurantId: string;
  restaurantName: string;
  createdAt: string;
}

interface ManagedMealRecordRow {
  id: string;
  restaurant_id: string;
  menu_item_id: string | null;
  menu_name_snapshot: string;
  paid_price: number;
  created_at: string;
  restaurants: { name: string } | { name: string }[] | null;
}

export function mapManagedMealRecord(row: ManagedMealRecordRow): ManagedMealRecord {
  const restaurant = Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants;

  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    restaurantName: restaurant?.name ?? "알 수 없는 식당",
    menuItemId: row.menu_item_id,
    menuName: row.menu_name_snapshot,
    paidPrice: row.paid_price,
    createdAt: row.created_at,
  };
}

export async function getMealRecordsForEmployee(employeeId: string): Promise<ManagedMealRecord[]> {
  const { data, error } = await createServiceRoleClient()
    .from("meal_records")
    .select("id, restaurant_id, menu_item_id, menu_name_snapshot, paid_price, created_at, restaurants(name)")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("식사 기록 조회에 실패했습니다.");
  return ((data ?? []) as ManagedMealRecordRow[]).map(mapManagedMealRecord);
}

export async function getMealRecordForEmployee(
  employeeId: string,
  recordId: string,
): Promise<ManagedMealRecord | null> {
  const { data, error } = await createServiceRoleClient()
    .from("meal_records")
    .select("id, restaurant_id, menu_item_id, menu_name_snapshot, paid_price, created_at, restaurants(name)")
    .eq("id", recordId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) throw new Error("식사 기록 조회에 실패했습니다.");
  return data ? mapManagedMealRecord(data as ManagedMealRecordRow) : null;
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
