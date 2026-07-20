"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/auth/admin-log";
import { createServiceRoleClient } from "@/lib/supabase/server";

const coordsSchema = z.object({
  companyLat: z.coerce.number().min(-90).max(90),
  companyLng: z.coerce.number().min(-180).max(180),
  defaultRadiusM: z.coerce.number().int().positive(),
});

export async function updateInviteCode(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const inviteCode = String(formData.get("inviteCode") ?? "").trim();
  if (!inviteCode) {
    throw new Error("초대코드를 입력해주세요.");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ invite_code: inviteCode, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    throw new Error("초대코드 변경에 실패했습니다.");
  }

  await logAdminAction(admin.id, "update_invite_code", { targetType: "app_settings" });
  revalidatePath("/admin/settings");
}

export async function updateCompanyCoords(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const parsed = coordsSchema.safeParse({
    companyLat: formData.get("companyLat"),
    companyLng: formData.get("companyLng"),
    defaultRadiusM: formData.get("defaultRadiusM"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      company_lat: parsed.data.companyLat,
      company_lng: parsed.data.companyLng,
      default_radius_m: parsed.data.defaultRadiusM,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    throw new Error("회사 좌표·반경 변경에 실패했습니다.");
  }

  await logAdminAction(admin.id, "update_company_coords", { targetType: "app_settings" });
  revalidatePath("/admin/settings");
}

export async function updateAnnouncement(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const announcementRaw = String(formData.get("announcement") ?? "").trim();
  const announcement = announcementRaw ? announcementRaw : null;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ announcement, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    throw new Error("공지 변경에 실패했습니다.");
  }

  await logAdminAction(admin.id, "update_announcement", { targetType: "app_settings" });
  revalidatePath("/admin/settings");
}
