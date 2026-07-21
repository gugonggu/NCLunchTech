import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-brand-dark">404</p>
      <h1 className="text-2xl font-bold text-ink">페이지를 찾을 수 없어요</h1>
      <p className="text-ink-muted">주소가 바뀌었거나 삭제된 페이지예요.</p>
      <Link href="/" className={buttonStyles({ variant: "primary" })}>
        홈으로 가기
      </Link>
    </main>
  );
}
