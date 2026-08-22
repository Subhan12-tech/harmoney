/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Static export: the whole app builds to plain files that FastAPI serves
  // itself. One service instead of two, and because the UI and the API share an
  // origin there is no CORS to configure or get wrong.
  output: "export",

  // Every route becomes a directory with an index.html, so a deep link like
  // /app/documents resolves without server-side rewriting.
  trailingSlash: true,

  // next/image's optimiser needs a server; an export has none.
  images: { unoptimized: true },
};

export default nextConfig;
