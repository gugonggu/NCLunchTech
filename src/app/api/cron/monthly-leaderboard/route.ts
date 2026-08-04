import { finalizeMissingMonthlyLeaderboards } from "@/lib/monthly-leaders/queries";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }

  const now = new Date();
  await finalizeMissingMonthlyLeaderboards(now);
  return Response.json({ finalized: true });
}
