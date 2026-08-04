import { finalizeMissingMonthlyLeaderboards } from "@/lib/monthly-leaders/queries";

function getSeoulDay(now: Date) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", day: "numeric" })
    .formatToParts(now)
    .find((part) => part.type === "day")?.value;
  return Number(day);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }

  const now = new Date();
  if (getSeoulDay(now) !== 1) {
    return new Response(null, { status: 204 });
  }

  await finalizeMissingMonthlyLeaderboards(now);
  return Response.json({ finalized: true });
}
