import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = "https://jetblackrlsh.github.io/Planet-Man-Comics";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const catalogPath = path.join(repoRoot, "web-app/comics.json");

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

const urls = [
  {
    loc: `${SITE_ROOT}/web-app/`,
    changefreq: "weekly",
    priority: "1.0",
  },
  {
    loc: `${SITE_ROOT}/web-app/issues/`,
    changefreq: "weekly",
    priority: "0.9",
  },
  {
    loc: `${SITE_ROOT}/web-app/bonus/`,
    changefreq: "weekly",
    priority: "0.7",
  },
  ...catalog.map((issue) => ({
    loc: `${SITE_ROOT}/web-app/issues/${encodeURIComponent(issue.slug)}/`,
    changefreq: "monthly",
    priority: "0.9",
    image: {
      loc: absoluteSiteUrl(issue.cover),
      title: `Planet-Man: ${issue.title}`,
      caption: clampSentence(issue.summary, 240),
    },
  })),
  ...catalog
    .filter((issue) => issue.pdf)
    .map((issue) => ({
      loc: absoluteSiteUrl(issue.pdf),
      changefreq: "yearly",
      priority: "0.5",
    })),
];

await writeFile(path.join(repoRoot, "sitemap.xml"), sitemapXml(urls));
await writeFile(
  path.join(repoRoot, "robots.txt"),
  `User-agent: *
Allow: /

Sitemap: ${SITE_ROOT}/sitemap.xml
`,
);

console.log(`Wrote ${urls.length} URLs to sitemap.xml and robots.txt`);

function sitemapXml(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map(urlXml).join("\n")}
</urlset>
`;
}

function urlXml(entry) {
  return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>${entry.image ? `\n${imageXml(entry.image)}` : ""}
  </url>`;
}

function imageXml(image) {
  return `    <image:image>
      <image:loc>${escapeXml(image.loc)}</image:loc>
      <image:title>${escapeXml(image.title)}</image:title>
      <image:caption>${escapeXml(image.caption)}</image:caption>
    </image:image>`;
}

function absoluteSiteUrl(catalogPath) {
  const normalized = catalogPath.replace(/^\.\.\//, "");
  return encodeURI(`${SITE_ROOT}/${normalized}`);
}

function clampSentence(value, maxLength) {
  const normalized = String(value).replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const clipped = normalized.slice(0, maxLength + 1);
  const sentenceEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("!"), clipped.lastIndexOf("?"));
  if (sentenceEnd >= 120) return clipped.slice(0, sentenceEnd + 1);

  const wordEnd = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, wordEnd > 0 ? wordEnd : maxLength).replace(/[,.!:;]+$/, "")}...`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
