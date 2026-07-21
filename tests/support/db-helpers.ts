import { createClient } from "@supabase/supabase-js";
import { clearEntity, recordEntity } from "./registry";

function getTestClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("테스트 Supabase 환경변수가 로드되지 않았습니다(.env.test.local 확인).");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function generateTestNickname(): string {
  return `e2e${Math.random().toString(36).slice(2, 10)}`;
}

/** 테스트 전용 프로젝트의 app_settings.invite_code를 실행 시점에 조회한다(코드에 하드코딩하지 않음). */
export async function getInviteCode(): Promise<string> {
  const supabase = getTestClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("invite_code")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data?.invite_code) {
    throw new Error("테스트 프로젝트의 app_settings.invite_code를 조회할 수 없습니다.");
  }

  return data.invite_code as string;
}

export async function findEmployeeIdByNickname(nickname: string): Promise<string | null> {
  const supabase = getTestClient();
  const { data } = await supabase
    .from("employees")
    .select("id")
    .eq("nickname", nickname)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}

export async function deleteEmployeeById(registryPath: string, id: string): Promise<void> {
  const supabase = getTestClient();
  const { error } = await supabase.from("employees").delete().eq("id", id);

  if (error) {
    throw new Error(`테스트 직원 삭제 실패(${id}): ${error.message}`);
  }

  clearEntity(registryPath, "employees", id);
}

export async function createTestRestaurant(
  registryPath: string,
  overrides: Partial<{
    category: string;
    isActive: boolean;
    lat: number;
    lng: number;
    name: string;
  }> = {}
): Promise<string> {
  const supabase = getTestClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("company_lat, company_lng")
    .eq("id", 1)
    .maybeSingle();

  const suffix = Math.random().toString(36).slice(2, 10);
  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      kakao_place_id: `e2e-test-${suffix}`,
      name: overrides.name ?? `E2E 테스트 식당 ${suffix}`,
      category: overrides.category ?? "기타",
      address: "테스트 주소",
      lat: overrides.lat ?? settings?.company_lat ?? 35.0,
      lng: overrides.lng ?? settings?.company_lng ?? 129.0,
      is_active: overrides.isActive ?? true,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`테스트 식당 생성 실패: ${error?.message}`);
  }

  recordEntity(registryPath, "restaurants", data.id as string);
  return data.id as string;
}

export async function replaceTestRestaurantHours(
  restaurantId: string,
  rows: Array<{
    dayOfWeek: number;
    isClosed: boolean;
    openTime: string | null;
    closeTime: string | null;
  }>,
): Promise<void> {
  const supabase = getTestClient();
  const { error: deleteError } = await supabase
    .from("restaurant_hours")
    .delete()
    .eq("restaurant_id", restaurantId);

  if (deleteError) {
    throw new Error(`Failed to delete test restaurant hours: ${deleteError.message}`);
  }

  if (rows.length === 0) return;

  const { error: insertError } = await supabase.from("restaurant_hours").insert(
    rows.map((row) => ({
      restaurant_id: restaurantId,
      day_of_week: row.dayOfWeek,
      is_closed: row.isClosed,
      open_time: row.openTime,
      close_time: row.closeTime,
    })),
  );

  if (insertError) {
    throw new Error(`Failed to create test restaurant hours: ${insertError.message}`);
  }
}

export async function deleteRestaurantById(registryPath: string, id: string): Promise<void> {
  const supabase = getTestClient();
  const { error } = await supabase.from("restaurants").delete().eq("id", id);

  if (error) {
    throw new Error(`테스트 식당 삭제 실패(${id}): ${error.message}`);
  }

  clearEntity(registryPath, "restaurants", id);
}

export async function createTestMenuItem(
  registryPath: string,
  restaurantId: string,
  name = "테스트 메뉴",
  price: number | null = 5000
): Promise<string> {
  const supabase = getTestClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({ restaurant_id: restaurantId, name, price })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`테스트 메뉴 생성 실패: ${error?.message}`);
  }

  recordEntity(registryPath, "menu_items", data.id as string);
  return data.id as string;
}

export async function deleteMenuItemById(registryPath: string, id: string): Promise<void> {
  const supabase = getTestClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    throw new Error(`테스트 메뉴 삭제 실패(${id}): ${error.message}`);
  }

  clearEntity(registryPath, "menu_items", id);
}

/** registry에 남은 항목을 테이블 종류에 따라 정리할 때 쓰는 디스패처. */
export async function deleteEntityByTable(registryPath: string, table: string, id: string): Promise<void> {
  if (table === "employees") return deleteEmployeeById(registryPath, id);
  if (table === "restaurants") return deleteRestaurantById(registryPath, id);
  if (table === "menu_items") return deleteMenuItemById(registryPath, id);
  throw new Error(`알 수 없는 테이블: ${table}`);
}
