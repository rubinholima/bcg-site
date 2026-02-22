"use client";

import Image from "next/image";

type SmartImageProps = React.ComponentProps<typeof Image>;

/**
 * Image nativo do Next.js. src deve ser URL direta do domínio (getPublicImageUrl).
 * Apenas www.bostoncitygroup.biz/media/* e /logos/* — sem proxy e sem redirecionamento.
 */
export function SmartImage({
  src,
  alt,
  className,
  width,
  height,
  fill,
  sizes,
  unoptimized,
  ...rest
}: SmartImageProps) {
  return (
    <Image
      src={src}
      alt={alt ?? ""}
      className={className}
      width={width}
      height={height}
      fill={fill}
      sizes={sizes}
      unoptimized={unoptimized}
      {...rest}
    />
  );
}
