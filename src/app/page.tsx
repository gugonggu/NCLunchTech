export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-brand-bg px-6 py-12 text-center">
      <h1 className="text-2xl font-bold text-brand-dark">앤시점심기술</h1>
      <p className="text-neutral-700">
        앤시정보기술 동료들과 점심 메뉴를 정하는 사내 서비스입니다.
      </p>
      <p className="rounded-2xl bg-white px-4 py-3 text-sm text-neutral-500 shadow-sm">
        로그인 기능은 다음 단계에서 추가될 예정입니다.
      </p>
    </main>
  );
}
