import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getMealRecordForEmployee } from "@/lib/meals/queries";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { GradientBackdrop, GRADIENT_TEXT } from "@/components/ui/GradientBackdrop";
import { ManagedMealRecordForm } from "@/components/me/ManagedMealRecordForm";

const messages = { invalid_input: "메뉴와 가격을 다시 확인해주세요.", invalid_menu: "이 식당의 등록 메뉴만 선택할 수 있어요." } as const;

export default async function MealRecordEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mealStatus?: string }> }) {
  const [{ id }, { mealStatus }] = await Promise.all([params, searchParams]);
  const employee = await getCurrentEmployee();
  if (!employee) redirect(`/login?returnTo=${encodeURIComponent(`/me/meal-records/${id}`)}`);
  const record = await getMealRecordForEmployee(employee.id, id);
  if (!record) redirect("/me?mealStatus=not_found");

  const { data: menuItems, error } = await createServiceRoleClient().from("menu_items").select("id, name, price").eq("restaurant_id", record.restaurantId).order("created_at");
  if (error) throw new Error("등록 메뉴 조회에 실패했습니다.");
  const message = mealStatus && Object.hasOwn(messages, mealStatus) ? messages[mealStatus as keyof typeof messages] : null;

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-hidden px-6 py-8">
      <GradientBackdrop />
      <Link href="/me" className="text-sm text-ink-muted">내 정보로</Link>
      <h1 className={`text-2xl font-extrabold tracking-tight sm:text-3xl ${GRADIENT_TEXT}`}>식사 기록 수정</h1>
      <p className="text-ink">{record.restaurantName}</p>
      {message && <p className="text-sm text-danger">{message}</p>}
      <ManagedMealRecordForm record={record} menuItems={menuItems ?? []} />
    </main>
  );
}
