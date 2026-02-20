"use client";

import Image from "next/image";
import { isBcgS3Asset } from "@/lib/isBcgS3Asset";

type SmartImageProps = React.ComponentProps<typeof Image>;

/**
 * Para assets S3 do bucket BCG, renderiza <img> direto (evita 403 do next/image).
 * Demais URLs usam next/image normalmente.
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
  const srcStr = typeof src === "string" ? src : undefined;
  if (isBcgS3Asset(srcStr)) {
    const imgClassName = fill ? `${className ?? ""} object-cover`.trim() : className;
    const imgStyle: React.CSSProperties | undefined = fill
      ? ({ position: "absolute", inset: 0, width: "100%", height: "100%" } as React.CSSProperties)
      : undefined;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={srcStr}
        alt={alt ?? ""}
        className={imgClassName}
        style={imgStyle}
        loading="lazy"
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        {...rest}
      />
    );
  }
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
