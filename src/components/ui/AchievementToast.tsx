"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface UnreadAchievement {
  code: string;
  name: string;
  description: string;
  pointReward: number;
  titleName: string | null;
}

const SKIP_PATH_PREFIXES = ["/login", "/signup", "/admin"];

/** 로그인 후 페이지 이동마다(방문 완료·리뷰 작성 등 redirect 포함) 새로 달성한 업적을 확인해 토스트로 보여준다. */
export function AchievementToastWatcher() {
  const pathname = usePathname();
  const [achievements, setAchievements] = useState<UnreadAchievement[]>([]);

  useEffect(() => {
    if (SKIP_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return;
    }

    let cancelled = false;
    fetch("/api/achievements/unread")
      .then((res) => (res.ok ? res.json() : { achievements: [] }))
      .then((body: { achievements?: UnreadAchievement[] }) => {
        if (!cancelled && body.achievements && body.achievements.length > 0) {
          setAchievements(body.achievements);
        }
      })
      .catch(() => {
        // 알림 조회 실패는 조용히 무시한다(핵심 기능이 아님).
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (achievements.length === 0) return;
    const timer = setTimeout(() => setAchievements([]), 6000);
    return () => clearTimeout(timer);
  }, [achievements]);

  if (achievements.length === 0) {
    return null;
  }

  const totalPoints = achievements.reduce((sum, a) => sum + a.pointReward, 0);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 md:bottom-6">
      <div
        role="status"
        className="pointer-events-auto w-full max-w-sm rounded-card bg-surface px-4 py-4 shadow-card ring-1 ring-line"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-brand-dark">
            🏆 {achievements.length > 1 ? `업적 ${achievements.length}개 달성!` : "업적 달성!"}
          </p>
          <button
            type="button"
            onClick={() => setAchievements([])}
            className="text-xs font-semibold text-ink-muted hover:text-ink"
            aria-label="닫기"
          >
            닫기
          </button>
        </div>
        <ul className="mt-2 flex flex-col gap-1">
          {achievements.map((achievement) => (
            <li key={achievement.code} className="text-sm text-ink">
              <span className="font-semibold">{achievement.name}</span>
              <span className="text-ink-muted"> · {achievement.description}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm font-semibold text-brand-dark">+{totalPoints} 업적 포인트</p>
      </div>
    </div>
  );
}
