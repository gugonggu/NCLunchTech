export function AvatarImage({
  previewUrl,
  alt,
  size = 40,
}: {
  previewUrl: string;
  alt: string;
  size?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={previewUrl}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-full border border-line object-cover"
      style={{ width: size, height: size }}
    />
  );
}
