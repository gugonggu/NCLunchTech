import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

export async function GET() {
  let env;

  try {
    env = getServerEnv();
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "환경변수 검증 실패",
      },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: `Supabase 응답 오류: ${res.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ status: "ok", supabase: "reachable" });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Supabase 연결 실패",
      },
      { status: 502 }
    );
  }
}
