"use client";

import Image from "next/image";
import { useState } from "react";

type SmartImageProps = React.ComponentProps<typeof Image>;

/** Imagens devem vir de getPublicImageUrl (domínio principal único: www.bostoncitygroup.biz). Sem proxy. */
export function SmartImage({
  src,
  alt,
  className,
  width,
  height,
  fill,
  sizes,
  unoptimized,
  onError,
  ...rest
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    setFailed(true);
    onError?.(e);
  };

  if (failed) {
    return (
      <div
        className={className}
        style={{
          ...(fill
            ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
            : { width: width ?? 64, height: height ?? 64 }),
          background: "var(--fallback-bg, #27272a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#71717a",
          fontSize: "0.75rem",
        }}
        aria-hidden
      >
        —
      </div>
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
      onError={handleError}
      {...rest}
    />
  );
}
