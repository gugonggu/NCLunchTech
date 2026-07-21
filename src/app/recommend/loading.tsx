import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function RecommendLoading() {
  return (
    <main className="flex w-full flex-1 flex-col gap-6" aria-label="추천 결과 불러오는 중">
      <header className="space-y-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-9 w-56" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Card padding="none" className="overflow-hidden">
            <Skeleton className="aspect-[16/10] w-full rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-12 w-full" />
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((index) => (
              <Card key={index} padding="none" className="overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        </section>

        <Card className="hidden space-y-4 md:block lg:col-start-2 lg:row-start-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      </div>
    </main>
  );
}
