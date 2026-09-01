import type { NextConfig } from "next";

// The public build is a static export for GitHub Pages, which serves a project
// site from /<repo>; the local server has no such prefix. Everything else is
// identical, so the page you develop against is the page that ships.
const isStatic = process.env.TECHCAL_STATIC === "1";
const basePath = process.env.TECHCAL_BASE_PATH ?? (isStatic ? "/techcal" : "");

const nextConfig: NextConfig = {
  ...(isStatic ? { output: "export", trailingSlash: true, images: { unoptimized: true } } : {}),
  ...(basePath ? { basePath } : {}),
  // Plain <a href> and fetches do not get basePath applied for us.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
