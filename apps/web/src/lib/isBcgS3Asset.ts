export function isBcgS3Asset(src?: string): boolean {
  if (!src) return false;
  return (
    src.startsWith("https://bcg-platform-assets.s3.us-east-1.amazonaws.com/") ||
    src.startsWith("https://bcg-platform-assets.s3.amazonaws.com/")
  );
}
