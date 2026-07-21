interface RestaurantVisualProps {
  name: string;
  category: string;
  photoUrl: string | null;
  priority?: boolean;
}

export function RestaurantVisual({
  name,
  category,
  photoUrl,
  priority = false,
}: RestaurantVisualProps) {
  const aspectClass = priority ? "aspect-[16/10]" : "aspect-[4/3]";

  if (photoUrl) {
    return (
      // 대표 이미지는 사용자 업로드 Storage URL을 그대로 표시하는 단순 비주얼이다.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={`${name} 음식 사진`}
        className={`${aspectClass} w-full object-cover`}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name} 이미지 준비 중`}
      className={`${aspectClass} flex w-full items-center justify-center bg-surface-muted px-4 text-center`}
    >
      <span className="text-sm font-semibold text-ink-muted">{category}</span>
    </div>
  );
}
