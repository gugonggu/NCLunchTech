"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function PollRealtimeRefresh({ pollId }: { pollId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase.channel(`poll:${pollId}`).on("postgres_changes", { event: "*", schema: "public", table: "poll_votes", filter: `poll_id=eq.${pollId}` }, () => router.refresh()).on("postgres_changes", { event: "UPDATE", schema: "public", table: "polls", filter: `id=eq.${pollId}` }, () => router.refresh()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pollId, router]);
  return null;
}
