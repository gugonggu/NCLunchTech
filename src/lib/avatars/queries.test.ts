import { beforeEach, describe, expect, it, vi } from "vitest";
import { AVATAR_DEFAULT_OPTIONS } from "./validation";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  renderAvatarPng: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: mocks.createServiceRoleClient }));
vi.mock("./render", () => ({ renderAvatarPng: mocks.renderAvatarPng }));

import { getAvatarPreviewUrls, getMyAvatar, saveAvatarOptions } from "./queries";

function setupClient({
  uploadError = null,
  updateError = null,
  selectResult = null,
}: { uploadError?: Error | null; updateError?: Error | null; selectResult?: unknown } = {}) {
  const upload = vi.fn().mockResolvedValue({ error: uploadError });
  const getPublicUrl = vi.fn((path: string) => ({ data: { publicUrl: `https://avatars.test/${path}` } }));
  const storageFrom = vi.fn(() => ({ upload, getPublicUrl }));

  const update = vi.fn((_update: Record<string, unknown>) => ({ eq: vi.fn().mockResolvedValue({ error: updateError }) }));
  const maybeSingle = vi.fn().mockResolvedValue({ data: selectResult });
  const inFilter = vi.fn().mockResolvedValue({ data: selectResult });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq, in: inFilter }));
  const from = vi.fn(() => ({ update, select }));

  const client = { from, storage: { from: storageFrom } };
  mocks.createServiceRoleClient.mockReturnValue(client);
  return { client, upload, update, eq, select, inFilter };
}

describe("saveAvatarOptions", () => {
  beforeEach(() => {
    mocks.createServiceRoleClient.mockReset();
    mocks.renderAvatarPng.mockReset();
  });

  it("rejects invalid options without touching the database", async () => {
    const { client } = setupClient();
    const result = await saveAvatarOptions("emp-1", { ...AVATAR_DEFAULT_OPTIONS, top: "not-real" });
    expect(result).toEqual({ ok: false, previewUpdated: false });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("saves options and updates the preview path when rendering succeeds", async () => {
    mocks.renderAvatarPng.mockResolvedValue(Buffer.from("png"));
    const { client, upload, update } = setupClient();

    const result = await saveAvatarOptions("emp-1", AVATAR_DEFAULT_OPTIONS);

    expect(result).toEqual({ ok: true, previewUpdated: true });
    expect(upload).toHaveBeenCalledWith(
      "emp-1.png",
      expect.anything(),
      expect.objectContaining({ contentType: "image/png", upsert: true }),
    );
    expect(client.from).toHaveBeenCalledWith("employees");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_type: "2d", avatar_options: AVATAR_DEFAULT_OPTIONS, avatar_storage_path: "emp-1.png" }),
    );
  });

  it("still saves options when preview rendering throws, but keeps the previous preview path", async () => {
    mocks.renderAvatarPng.mockRejectedValue(new Error("render failed"));
    const { update } = setupClient();

    const result = await saveAvatarOptions("emp-1", AVATAR_DEFAULT_OPTIONS);

    expect(result).toEqual({ ok: true, previewUpdated: false });
    const savedUpdate = update.mock.calls[0][0];
    expect(savedUpdate).toMatchObject({ avatar_type: "2d", avatar_options: AVATAR_DEFAULT_OPTIONS });
    expect(savedUpdate).not.toHaveProperty("avatar_storage_path");
  });

  it("still saves options when the storage upload resolves with an error, but keeps the previous preview path", async () => {
    mocks.renderAvatarPng.mockResolvedValue(Buffer.from("png"));
    const { update } = setupClient({ uploadError: new Error("upload failed") });

    const result = await saveAvatarOptions("emp-1", AVATAR_DEFAULT_OPTIONS);

    expect(result).toEqual({ ok: true, previewUpdated: false });
    const savedUpdate = update.mock.calls[0][0];
    expect(savedUpdate).toMatchObject({ avatar_type: "2d", avatar_options: AVATAR_DEFAULT_OPTIONS });
    expect(savedUpdate).not.toHaveProperty("avatar_storage_path");
  });

  it("reports failure when the employees table update fails, even though the upload succeeded", async () => {
    mocks.renderAvatarPng.mockResolvedValue(Buffer.from("png"));
    const { update } = setupClient({ updateError: new Error("update failed") });

    const result = await saveAvatarOptions("emp-1", AVATAR_DEFAULT_OPTIONS);

    expect(result).toEqual({ ok: false, previewUpdated: true });
    const savedUpdate = update.mock.calls[0][0];
    expect(savedUpdate).toMatchObject({
      avatar_type: "2d",
      avatar_options: AVATAR_DEFAULT_OPTIONS,
      avatar_storage_path: "emp-1.png",
    });
  });
});

describe("getMyAvatar", () => {
  beforeEach(() => {
    mocks.createServiceRoleClient.mockReset();
  });

  it("returns the default preview when no avatar is set", async () => {
    setupClient({ selectResult: { avatar_type: null, avatar_options: null, avatar_storage_path: null } });
    await expect(getMyAvatar("emp-1")).resolves.toEqual({
      type: null,
      options: null,
      previewUrl: "/avatar-default.png",
    });
  });

  it("returns the saved options and derived preview URL", async () => {
    setupClient({
      selectResult: { avatar_type: "2d", avatar_options: AVATAR_DEFAULT_OPTIONS, avatar_storage_path: "emp-1.png" },
    });
    await expect(getMyAvatar("emp-1")).resolves.toEqual({
      type: "2d",
      options: AVATAR_DEFAULT_OPTIONS,
      previewUrl: "https://avatars.test/emp-1.png",
    });
  });

  it("self-heals to null options when the stored avatar_options contain a stale/invalid value", async () => {
    setupClient({
      selectResult: {
        avatar_type: "2d",
        avatar_options: { ...AVATAR_DEFAULT_OPTIONS, top: "no-longer-a-valid-option" },
        avatar_storage_path: "emp-1.png",
      },
    });
    await expect(getMyAvatar("emp-1")).resolves.toEqual({
      type: "2d",
      options: null,
      previewUrl: "https://avatars.test/emp-1.png",
    });
  });
});

describe("getAvatarPreviewUrls", () => {
  beforeEach(() => {
    mocks.createServiceRoleClient.mockReset();
  });

  it("returns an empty map without querying for an empty input", async () => {
    await expect(getAvatarPreviewUrls([])).resolves.toEqual(new Map());
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("falls back to the default image for employees without a stored avatar", async () => {
    setupClient({
      selectResult: [
        { id: "emp-1", avatar_storage_path: "emp-1.png" },
        { id: "emp-2", avatar_storage_path: null },
      ],
    });
    await expect(getAvatarPreviewUrls(["emp-1", "emp-2"])).resolves.toEqual(
      new Map([
        ["emp-1", "https://avatars.test/emp-1.png"],
        ["emp-2", "/avatar-default.png"],
      ]),
    );
  });
});
