import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 py-2" aria-label="불러오는 중">
      <Skeleton className="h-8 w-40" />
      <Card padding="none" className="overflow-hidden">
        <Skeleton className="h-56 w-full rounded-card" />
      </Card>
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </main>
  );
}
