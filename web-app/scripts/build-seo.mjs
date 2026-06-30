import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = "https://jetblackrlsh.github.io/Planet-Man-Comics";
const FEED_URL = `${SITE_ROOT}/rss.xml`;

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
  {
    loc: `${SITE_ROOT}/web-app/ai-limitations/`,
    changefreq: "monthly",
    priority: "0.7",
  },
  {
    loc: `${SITE_ROOT}/web-app/other-comics/`,
    changefreq: "monthly",
    priority: "0.7",
  },
  {
    loc: `${SITE_ROOT}/web-app/follow/`,
    changefreq: "monthly",
    priority: "0.8",
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
await writeFile(path.join(repoRoot, "rss.xml"), rssXml(catalog));
await writeFile(
  path.join(repoRoot, "robots.txt"),
  `User-agent: *
Allow: /

Sitemap: ${SITE_ROOT}/sitemap.xml
`,
);

console.log(`Wrote ${urls.length} URLs to sitemap.xml, rss.xml, and robots.txt`);

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

function rssXml(catalog) {
  const items = [...catalog]
    .sort((a, b) => b.number - a.number)
    .map(feedItemXml)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Planet-Man Comics Releases</title>
    <link>${SITE_ROOT}/web-app/</link>
    <description>New Planet-Man comic issues published to the static web reader.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE_ROOT}/Reference%20Images/00-series-logo-wordmark.png</url>
      <title>Planet-Man Comics Releases</title>
      <link>${SITE_ROOT}/web-app/</link>
    </image>
${items}
  </channel>
</rss>
`;
}

function feedItemXml(issue) {
  const issueUrl = `${SITE_ROOT}/web-app/issues/${encodeURIComponent(issue.slug)}/`;
  const title = `Planet-Man: ${issue.title} | Issue ${issue.number}`;
  const description = clampSentence(
    `Read Planet-Man: ${issue.title}, issue ${issue.number} of the Planet-Man Comics series. ${issue.summary}`,
    500,
  );

  return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(issueUrl)}</link>
      <guid isPermaLink="true">${escapeXml(issueUrl)}</guid>
      <description>${escapeXml(description)}</description>
      <category>Planet-Man Comics</category>
    </item>`;
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
