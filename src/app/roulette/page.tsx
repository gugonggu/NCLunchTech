import { redirect } from "next/navigation";

export default async function LunchRoulettePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (value) params.set(key, value);
  }
  params.set("roulette", "on");
  redirect(`/recommend?${params.toString()}`);
}
