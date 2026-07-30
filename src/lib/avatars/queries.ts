import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isValidAvatarOptions, type AvatarOptions } from "./validation";
import { renderAvatarPng } from "./render";

export const AVATAR_BUCKET = "avatars";
export const DEFAULT_AVATAR_IMAGE_PATH = "/avatar-default.png";

function buildAvatarStoragePath(employeeId: string): string {
  return `${employeeId}.png`;
}

function toPublicUrl(storagePath: string, supabase: ReturnType<typeof createServiceRoleClient>): string {
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export interface SaveAvatarResult {
  ok: boolean;
  previewUpdated: boolean;
}

/** 2D 아바타 옵션을 저장한다. 미리보기 PNG 생성/업로드가 실패해도 옵션 저장 자체는 성공시킨다. */
export async function saveAvatarOptions(employeeId: string, options: AvatarOptions): Promise<SaveAvatarResult> {
  if (!isValidAvatarOptions(options)) {
    return { ok: false, previewUpdated: false };
  }

  const supabase = createServiceRoleClient();
  const storagePath = buildAvatarStoragePath(employeeId);

  let previewUpdated = false;
  try {
    const png = await renderAvatarPng(options);
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(storagePath, new Blob([new Uint8Array(png)], { type: "image/png" }), {
        contentType: "image/png",
        upsert: true,
        cacheControl: "0",
      });
    previewUpdated = !uploadError;
  } catch {
    previewUpdated = false;
  }

  const update: Record<string, unknown> = { avatar_type: "2d", avatar_options: options };
  if (previewUpdated) {
    update.avatar_storage_path = storagePath;
  }

  const { error } = await supabase.from("employees").update(update).eq("id", employeeId);
  return { ok: !error, previewUpdated };
}

export interface MyAvatar {
  type: "2d" | null;
  options: AvatarOptions | null;
  previewUrl: string;
}

export async function getMyAvatar(employeeId: string): Promise<MyAvatar> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("employees")
    .select("avatar_type, avatar_options, avatar_storage_path")
    .eq("id", employeeId)
    .maybeSingle();

  const type = data?.avatar_type === "2d" ? "2d" : null;
  const rawOptions = type === "2d" ? data!.avatar_options : null;
  const options = rawOptions && isValidAvatarOptions(rawOptions) ? rawOptions : null;
  const previewUrl = data?.avatar_storage_path
    ? toPublicUrl(data.avatar_storage_path, supabase)
    : DEFAULT_AVATAR_IMAGE_PATH;

  return { type, options, previewUrl };
}

/** 리뷰 목록 등 여러 직원의 미리보기 이미지를 한 번에 조회한다(없으면 기본 아바타로 채움). */
export async function getAvatarPreviewUrls(employeeIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (employeeIds.length === 0) {
    return result;
  }

  const supabase = createServiceRoleClient();
  const uniqueIds = [...new Set(employeeIds)];
  const { data } = await supabase.from("employees").select("id, avatar_storage_path").in("id", uniqueIds);

  for (const row of (data ?? []) as { id: string; avatar_storage_path: string | null }[]) {
    result.set(row.id, row.avatar_storage_path ? toPublicUrl(row.avatar_storage_path, supabase) : DEFAULT_AVATAR_IMAGE_PATH);
  }
  for (const id of uniqueIds) {
    if (!result.has(id)) {
      result.set(id, DEFAULT_AVATAR_IMAGE_PATH);
    }
  }
  return result;
}
