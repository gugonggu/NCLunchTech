import Link from "next/link";
import { getCurrentEmployee } from "@/lib/auth/session";
import { LogoutButton } from "./LogoutButton";

export default async function HomePage() {
  const employee = await getCurrentEmployee();

  if (!employee) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-brand-bg px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-brand-dark">앤시점심기술</h1>
        <p className="text-neutral-700">
          앤시정보기술 동료들과 점심 메뉴를 정하는 사내 서비스입니다.
        </p>
        <div className="flex w-full flex-col gap-2">
          <Link
            href="/login"
            className="rounded-2xl bg-brand px-4 py-3 text-center font-semibold text-white"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="rounded-2xl bg-white px-4 py-3 text-center font-semibold text-brand-dark shadow-sm"
          >
            회원가입
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-brand-bg px-6 py-12 text-center">
      <h1 className="text-2xl font-bold text-brand-dark">앤시점심기술</h1>
      <p className="text-neutral-700">{employee.nickname}님, 안녕하세요.</p>
      <div className="flex w-full flex-col gap-2">
        <Link
          href="/recommend"
          className="rounded-2xl bg-brand px-4 py-3 text-center font-semibold text-white"
        >
          오늘 뭐 먹지?
        </Link>
        <Link
          href="/restaurants"
          className="rounded-2xl bg-white px-4 py-3 text-center font-semibold text-brand-dark shadow-sm"
        >
          식당 찾기
        </Link>
        <LogoutButton />
      </div>
    </main>
  );
}
