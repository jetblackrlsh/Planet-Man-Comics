import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = "https://jetblackrlsh.github.io/Planet-Man-Comics";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const shareRoot = path.join(appRoot, "issues");
const catalogPath = path.join(appRoot, "comics.json");

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const appTemplate = await readFile(path.join(appRoot, "index.html"), "utf8");

await rm(shareRoot, { recursive: true, force: true });
await mkdir(shareRoot, { recursive: true });

await writeFile(
  path.join(shareRoot, "index.html"),
  issuePage(appTemplate, "../", {
    title: "Planet-Man Comics",
    description: "Read Planet-Man Comics in a static browser reader.",
    imageUrl: `${SITE_ROOT}/Reference%20Images/00-series-logo-wordmark.png`,
    shareUrl: `${SITE_ROOT}/web-app/issues/`,
    type: "website",
  }),
);

for (const issue of catalog) {
  const issueDir = path.join(shareRoot, issue.slug);
  const shareUrl = `${SITE_ROOT}/web-app/issues/${encodeURIComponent(issue.slug)}/`;

  await mkdir(issueDir, { recursive: true });
  await writeFile(
    path.join(issueDir, "index.html"),
    issuePage(appTemplate, "../../", {
      title: `Planet-Man Issue ${issue.number}: ${issue.title}`,
      description: issue.summary,
      imageUrl: absoluteSiteUrl(issue.cover),
      shareUrl,
    }),
  );
}

console.log(`Wrote ${catalog.length} issue share pages to web-app/issues`);

function issuePage(template, baseHref, metadata) {
  return template
    .replace(/<base href="[^"]+">/, `<base href="${escapeHtml(baseHref)}">`)
    .replace(/<!-- share-meta:start -->[\s\S]*?<!-- share-meta:end -->/, shareMetadata(metadata));
}

function shareMetadata({ title, description, imageUrl, shareUrl, type = "article" }) {
  return `<!-- share-meta:start -->
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(shareUrl)}">
    <meta property="og:type" content="${escapeHtml(type)}">
    <meta property="og:site_name" content="Planet-Man Comics">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:alt" content="${escapeHtml(title)} cover">
    <meta property="og:url" content="${escapeHtml(shareUrl)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
    <!-- share-meta:end -->`;
}

function absoluteSiteUrl(catalogPath) {
  const normalized = catalogPath.replace(/^\.\.\//, "");
  return encodeURI(`${SITE_ROOT}/${normalized}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
