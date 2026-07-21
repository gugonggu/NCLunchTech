"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

export function RecommendationFilterSubmit() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" block disabled={pending} aria-busy={pending}>
      {pending ? "추천 조건 적용 중…" : "이 조건으로 추천받기"}
    </Button>
  );
}
