"use server";

import { redirect } from "next/navigation";
import { announcementSchema, companySettingsSchema, inviteCodeSchema } from "@/lib/admin/validation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/auth/admin-log";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function updateInviteCode(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const parsed = inviteCodeSchema.safeParse(formData.get("inviteCode"));
  if (!parsed.success) {
    redirect("/admin/settings?status=invite_code_invalid");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("app_settings")
    .update({ invite_code: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("초대코드 변경에 실패했습니다.");
  }
  if (!data) {
    redirect("/admin/settings?status=settings_not_found");
  }

  await logAdminAction(admin.id, "update_invite_code", { targetType: "app_settings" });
  redirect("/admin/settings?status=invite_code_updated");
}

export async function updateCompanyCoords(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const parsed = companySettingsSchema.safeParse({
    companyLat: formData.get("companyLat"),
    companyLng: formData.get("companyLng"),
    defaultRadiusM: formData.get("defaultRadiusM"),
  });

  if (!parsed.success) {
    redirect("/admin/settings?status=coords_invalid");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("app_settings")
    .update({
      company_lat: parsed.data.companyLat,
      company_lng: parsed.data.companyLng,
      default_radius_m: parsed.data.defaultRadiusM,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("회사 좌표·반경 변경에 실패했습니다.");
  }
  if (!data) {
    redirect("/admin/settings?status=settings_not_found");
  }

  await logAdminAction(admin.id, "update_company_coords", { targetType: "app_settings" });
  redirect("/admin/settings?status=coords_updated");
}

export async function updateAnnouncement(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const parsed = announcementSchema.safeParse(formData.get("announcement"));
  if (!parsed.success) {
    redirect("/admin/settings?status=announcement_invalid");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("app_settings")
    .update({ announcement: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("공지 변경에 실패했습니다.");
  }
  if (!data) {
    redirect("/admin/settings?status=settings_not_found");
  }

  await logAdminAction(admin.id, "update_announcement", { targetType: "app_settings" });
  redirect("/admin/settings?status=announcement_updated");
}
