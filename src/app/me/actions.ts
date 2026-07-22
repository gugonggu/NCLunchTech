"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { profileSchema } from "@/lib/auth/validation";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function updateMyProfile(formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login?returnTo=%2Fme");
  }

  const parsed = profileSchema.safeParse({
    nickname: formData.get("nickname"),
    realName: formData.get("realName"),
  });
  if (!parsed.success) {
    redirect("/me?status=profile_invalid");
  }

  const supabase = createServiceRoleClient();
  if (parsed.data.nickname !== employee.nickname) {
    const { data: existing } = await supabase
      .from("employees")
      .select("id")
      .eq("nickname", parsed.data.nickname)
      .maybeSingle();
    if (existing && existing.id !== employee.id) {
      redirect("/me?status=nickname_taken");
    }
  }

  const { error } = await supabase
    .from("employees")
    .update({
      nickname: parsed.data.nickname,
      real_name: parsed.data.realName,
    })
    .eq("id", employee.id);

  if (error) {
    throw new Error("프로필 변경에 실패했습니다.");
  }

  redirect("/me?status=profile_updated");
}
