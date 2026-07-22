"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getMealRecordForEmployee } from "@/lib/meals/queries";
import { mealMenuNameSchema, mealRecordSchema, normalizeMealRecordFormData } from "@/lib/meals/validation";
import { createServiceRoleClient } from "@/lib/supabase/server";

function editorUrl(recordId: string, status: "invalid_input" | "invalid_menu") {
  return `/me/meal-records/${recordId}?mealStatus=${status}`;
}

export async function updateMealRecord(recordId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) redirect(`/login?returnTo=${encodeURIComponent(`/me/meal-records/${recordId}`)}`);

  const record = await getMealRecordForEmployee(employee.id, recordId);
  if (!record) redirect("/me?mealStatus=not_found");

  const parsed = mealRecordSchema.safeParse(normalizeMealRecordFormData(formData));
  if (!parsed.success) redirect(editorUrl(recordId, "invalid_input"));

  const supabase = createServiceRoleClient();
  let menuItemId: string | null = null;
  let menuName = parsed.data.customMenuName;
  if (parsed.data.menuItemId) {
    const { data: menuItem } = await supabase
      .from("menu_items")
      .select("id, name")
      .eq("id", parsed.data.menuItemId)
      .eq("restaurant_id", record.restaurantId)
      .maybeSingle();
    if (!menuItem) redirect(editorUrl(recordId, "invalid_menu"));
    const menuNameResult = mealMenuNameSchema.safeParse(menuItem.name);
    if (!menuNameResult.success) redirect(editorUrl(recordId, "invalid_menu"));
    menuItemId = menuItem.id;
    menuName = menuNameResult.data;
  }

  const { error } = await supabase
    .from("meal_records")
    .update({
      menu_item_id: menuItemId,
      menu_name_snapshot: menuName!,
      paid_price: parsed.data.paidPrice,
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id)
    .eq("employee_id", employee.id);
  if (error) throw new Error("식사 기록 수정에 실패했습니다.");

  redirect("/me?mealStatus=saved");
}

export async function deleteMealRecord(recordId: string) {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/login?returnTo=%2Fme");

  const record = await getMealRecordForEmployee(employee.id, recordId);
  if (!record) redirect("/me?mealStatus=not_found");

  const { error } = await createServiceRoleClient()
    .from("meal_records")
    .delete()
    .eq("id", record.id)
    .eq("employee_id", employee.id);
  if (error) throw new Error("식사 기록 삭제에 실패했습니다.");

  redirect("/me?mealStatus=deleted");
}
