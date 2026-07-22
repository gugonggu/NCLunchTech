"use client";

import { clearMyLunchAvailability, setMyLunchAvailability } from "@/app/lunch-availability/actions";
import { groupLunchAvailabilities, LUNCH_AVAILABILITY_OPTIONS, type LunchAvailability } from "@/lib/lunch-availability/validation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function LunchAvailabilityCard({
  employeeId,
  availabilities,
}: {
  employeeId: string;
  availabilities: LunchAvailability[];
}) {
  const mine = availabilities.find((availability) => availability.employeeId === employeeId) ?? null;
  const groups = groupLunchAvailabilities(availabilities);

  return (
    <section aria-label="오늘 같이 먹기">
      <Card className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-dark">Today</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">오늘 같이 먹기</h2>
          <p className="mt-1 text-sm text-ink-muted">오늘 점심 상태를 동료에게 공유해보세요.</p>
        </div>

        {mine && (
          <p className="rounded-control bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-dark">
            현재 상태 · {LUNCH_AVAILABILITY_OPTIONS.find((option) => option.value === mine.status)?.label}
          </p>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {LUNCH_AVAILABILITY_OPTIONS.map((option) => (
            <form key={option.value} action={setMyLunchAvailability.bind(null, option.value)}>
              <Button type="submit" variant={mine?.status === option.value ? "primary" : "secondary"} size="compact" block>
                {option.label}
              </Button>
            </form>
          ))}
        </div>

        {mine && (
          <form action={clearMyLunchAvailability}>
            <Button type="submit" variant="ghost" size="compact" block>
              상태 해제
            </Button>
          </form>
        )}

        {availabilities.length === 0 ? (
          <p className="rounded-control bg-surface-muted px-4 py-3 text-sm text-ink-muted">
            아직 오늘의 점심 상태를 공유한 동료가 없어요.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups
              .filter((group) => group.employees.length > 0)
              .map((group) => {
                const option = LUNCH_AVAILABILITY_OPTIONS.find((item) => item.value === group.status)!;
                const heading =
                  group.status === "looking_for_company" ? `${option.label} · ${group.employees.length}명` : option.label;

                return (
                  <div key={group.status} className="rounded-control bg-surface-muted px-4 py-3">
                    <h3 className="text-sm font-semibold text-ink">{heading}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{group.employees.map((employee) => employee.nickname).join(", ")}</p>
                  </div>
                );
              })}
          </div>
        )}
      </Card>
    </section>
  );
}
