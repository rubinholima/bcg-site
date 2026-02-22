"use client";

import Image from "next/image";

type SmartImageProps = React.ComponentProps<typeof Image>;

/**
 * Image nativo do Next.js para mídia (www.bostoncitygroup.biz/media/* e /logos/*).
 * Sem fallback para proxy e sem lógica de redirecionamento.
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
