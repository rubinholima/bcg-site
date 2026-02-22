"use client";

import Image from "next/image";

type SmartImageProps = React.ComponentProps<typeof Image>;

/**
 * Wrapper de next/image para URLs de mídia.
 * Com CloudFront OAC, todas as URLs são servidas pelo domínio oficial (www.bostoncitygroup.biz),
 * então next/image pode ser usado com otimização; não é mais necessário forçar <img> para S3.
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
