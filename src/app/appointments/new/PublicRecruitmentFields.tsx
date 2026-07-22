"use client";

import { useState } from "react";
import {
  PUBLIC_APPOINTMENT_CAPACITY_DEFAULT,
  PUBLIC_APPOINTMENT_CAPACITY_MAX,
  PUBLIC_APPOINTMENT_CAPACITY_MIN,
} from "@/lib/appointments/validation";

export function PublicRecruitmentFields() {
  const [isPublic, setIsPublic] = useState(false);

  return (
    <>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          name="isPublic"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
        />
        공개 모집
      </label>

      {isPublic ? (
        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          정원
          <input
            type="number"
            name="capacity"
            aria-label="정원"
            min={PUBLIC_APPOINTMENT_CAPACITY_MIN}
            max={PUBLIC_APPOINTMENT_CAPACITY_MAX}
            defaultValue={PUBLIC_APPOINTMENT_CAPACITY_DEFAULT}
            required
            className="rounded-control border border-line px-4 py-3 text-base text-ink"
          />
          <span className="text-xs">방장을 포함한 전체 인원이에요.</span>
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          참여자 닉네임 또는 실명
          <input
            type="text"
            name="participantNicknames"
            placeholder="예: 점심이, 홍길동"
            className="rounded-control border border-line px-4 py-3 text-base text-ink"
          />
        </label>
      )}
    </>
  );
}
