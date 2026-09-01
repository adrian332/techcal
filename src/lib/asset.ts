/**
 * GitHub Pages serves a project site under /<repo>, so the static build carries
 * a basePath. Next applies it to <Link> and next/image on its own, but not to
 * plain <a href> or fetches — those go through here.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}
