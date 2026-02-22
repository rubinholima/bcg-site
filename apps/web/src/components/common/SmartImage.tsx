"use client";

import Image from "next/image";

type SmartImageProps = React.ComponentProps<typeof Image>;

/**
 * Wrapper de next/image para URLs de mídia.
 * Assets vêm do domínio principal (www.bostoncitygroup.biz/media/* e /logos/* via CloudFront).
 * Usa apenas o componente Image do Next.js; sem fallback para proxy.
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
