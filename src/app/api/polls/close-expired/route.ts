import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data: polls, error } = await supabase.from("polls").select("id").eq("status", "open").lt("closes_at", now);
  if (error) return NextResponse.json({ message: "투표 조회에 실패했습니다." }, { status: 500 });
  const ids = (polls ?? []).map((poll) => poll.id);
  if (ids.length === 0) return NextResponse.json({ closed: 0 });
  const { error: updateError } = await supabase.from("polls").update({ status: "closed", closed_at: now }).in("id", ids).eq("status", "open");
  if (updateError) return NextResponse.json({ message: "투표 마감에 실패했습니다." }, { status: 500 });
  return NextResponse.json({ closed: ids.length });
}
