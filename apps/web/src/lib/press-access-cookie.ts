export function pressAccessCookieName(slug: string): string {
  return `bcg_press_${slug.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function pressAccessCookiePath(slug: string): string {
  return `/portfolio/${encodeURIComponent(slug)}/imprensa`;
}
