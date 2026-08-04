interface MonthlyLeaderBadgeProps {
  monthKey: string;
}

export function formatMonthlyLeaderLabel(monthKey: string): string {
  const [year, month] = monthKey.slice(0, 7).split("-");
  return `${year}년 ${Number(month)}월 이달의 리더`;
}

export function MonthlyLeaderBadge({ monthKey }: MonthlyLeaderBadgeProps) {
  return (
    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-dark">
      {formatMonthlyLeaderLabel(monthKey)}
    </span>
  );
}
