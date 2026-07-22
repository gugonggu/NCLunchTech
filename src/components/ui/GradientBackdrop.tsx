/** 화면 배경에 까는 블러 그라데이션 블롭 5개. 순수 CSS 애니메이션이라 서버 컴포넌트에서도 그대로 쓸 수 있다. */
export function GradientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="animate-drift absolute -right-24 -top-32 h-[26rem] w-[26rem] rounded-full bg-brand/45 blur-3xl" />
      <div
        className="animate-drift absolute -bottom-40 -left-28 h-[28rem] w-[28rem] rounded-full bg-[#ffb366]/55 blur-3xl"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="animate-drift absolute left-1/3 top-1/4 h-72 w-72 rounded-full bg-[#ff5c7a]/35 blur-3xl"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="animate-drift absolute bottom-1/3 right-1/4 h-64 w-64 rounded-full bg-[#ffd23f]/40 blur-3xl"
        style={{ animationDelay: "6s" }}
      />
      <div
        className="animate-drift absolute left-1/2 top-1/2 h-80 w-80 rounded-full bg-[#c94b8a]/25 blur-3xl"
        style={{ animationDelay: "8s" }}
      />
    </div>
  );
}

/** 헤드라인에 쓰는 공용 그라데이션 텍스트 클래스(오렌지→마젠타). */
export const GRADIENT_TEXT = "bg-gradient-to-r from-brand-dark to-[#c94b8a] bg-clip-text text-transparent";
