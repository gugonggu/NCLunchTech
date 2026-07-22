import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isLunchAvailabilityStatus, type LunchAvailability } from "./validation";

interface LunchAvailabilityRow {
  employee_id: string;
  status: string;
  employees: { nickname: string } | { nickname: string }[] | null;
}

export function toLunchAvailability(row: LunchAvailabilityRow): LunchAvailability | null {
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  if (!employee || !isLunchAvailabilityStatus(row.status)) {
    return null;
  }

  return {
    employeeId: row.employee_id,
    nickname: employee.nickname,
    status: row.status,
  };
}

/** 서울 기준 특정 날짜에 상태를 공유한 모든 직원을 닉네임순으로 조회한다. */
export async function getLunchAvailabilities(availabilityDate: string): Promise<LunchAvailability[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("lunch_availabilities")
    .select("employee_id, status, employees(nickname)")
    .eq("availability_date", availabilityDate)
    .order("nickname", { foreignTable: "employees", ascending: true });

  if (error) {
    throw new Error("점심 상태를 불러오지 못했습니다.");
  }

  return (data ?? [])
    .map((row) => toLunchAvailability(row as LunchAvailabilityRow))
    .filter((row): row is LunchAvailability => row !== null);
}
