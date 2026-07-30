"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { profileSchema } from "@/lib/auth/validation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { setSelectedTitle } from "@/lib/achievements/titles";
import { isValidAvatarOptions, type AvatarOptions } from "@/lib/avatars/validation";
import { saveAvatarOptions } from "@/lib/avatars/queries";

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
    if (error.code === "23505") {
      redirect("/me?status=nickname_taken");
    }
    throw new Error("프로필 변경에 실패했습니다.");
  }

  redirect("/me?status=profile_updated");
}

export async function updateSelectedTitle(formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login?returnTo=%2Fme");
  }

  const raw = formData.get("titleId");
  const titleId = typeof raw === "string" && raw.length > 0 ? raw : null;

  const ok = await setSelectedTitle(employee.id, titleId);
  redirect(ok ? "/me?titleStatus=title_updated" : "/me?titleStatus=title_invalid");
}

export async function updateAvatar(formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login?returnTo=%2Fme");
  }

  const options: AvatarOptions = {
    top: String(formData.get("top") ?? ""),
    eyebrows: String(formData.get("eyebrows") ?? ""),
    hairColor: String(formData.get("hairColor") ?? ""),
    skinColor: String(formData.get("skinColor") ?? ""),
    eyes: String(formData.get("eyes") ?? ""),
    mouth: String(formData.get("mouth") ?? ""),
    clothing: String(formData.get("clothing") ?? ""),
    clothesColor: String(formData.get("clothesColor") ?? ""),
    accessories: String(formData.get("accessories") ?? "none"),
    facialHair: String(formData.get("facialHair") ?? "none"),
  };

  if (!isValidAvatarOptions(options)) {
    redirect("/me?avatarStatus=avatar_invalid");
  }

  const result = await saveAvatarOptions(employee.id, options);
  if (!result.ok) {
    redirect("/me?avatarStatus=avatar_invalid");
  }

  redirect(result.previewUpdated ? "/me?avatarStatus=avatar_updated" : "/me?avatarStatus=avatar_preview_pending");
}
