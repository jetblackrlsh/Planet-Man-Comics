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
    description: "Browse every Planet-Man comic issue and open the static browser reader for individual stories, covers, pages, and downloadable PDFs.",
    imageUrl: `${SITE_ROOT}/Reference%20Images/00-series-logo-wordmark.png`,
    shareUrl: `${SITE_ROOT}/web-app/issues/`,
    type: "website",
    structuredData: collectionStructuredData(catalog),
  }),
);

for (const issue of catalog) {
  const issueDir = path.join(shareRoot, issue.slug);
  const shareUrl = `${SITE_ROOT}/web-app/issues/${encodeURIComponent(issue.slug)}/`;

  await mkdir(issueDir, { recursive: true });
  await writeFile(
    path.join(issueDir, "index.html"),
    issuePage(appTemplate, "../../", {
      title: `Read Planet-Man: ${issue.title} | Issue ${issue.number}`,
      description: issueDescription(issue),
      imageUrl: absoluteSiteUrl(issue.cover),
      shareUrl,
      pdfUrl: issue.pdf ? absoluteSiteUrl(issue.pdf) : "",
      structuredData: issueStructuredData(issue, shareUrl),
    }),
  );
}

console.log(`Wrote ${catalog.length} issue share pages to web-app/issues`);

function issuePage(template, baseHref, metadata) {
  return template
    .replace(/<base href="[^"]+">/, `<base href="${escapeHtml(baseHref)}">`)
    .replace(/<!-- share-meta:start -->[\s\S]*?<!-- share-meta:end -->/, shareMetadata(metadata));
}

function shareMetadata({ title, description, imageUrl, shareUrl, type = "article", structuredData }) {
  return `<!-- share-meta:start -->
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <meta name="author" content="Planet-Man Comics">
    <link rel="canonical" href="${escapeHtml(shareUrl)}">
    <link rel="sitemap" type="application/xml" href="${SITE_ROOT}/sitemap.xml">
    <link rel="image_src" href="${escapeHtml(imageUrl)}">
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
    <script type="application/ld+json">${escapeScriptJson(structuredData)}</script>
    <!-- share-meta:end -->`;
}

function absoluteSiteUrl(catalogPath) {
  const normalized = catalogPath.replace(/^\.\.\//, "");
  return encodeURI(`${SITE_ROOT}/${normalized}`);
}

function issueDescription(issue) {
  return clampSentence(
    `Read Planet-Man: ${issue.title}, issue ${issue.number} of the Planet-Man Comics series. ${issue.summary}`,
    260,
  );
}

function issueStructuredData(issue, shareUrl) {
  const imageUrl = absoluteSiteUrl(issue.cover);
  const pdfUrl = issue.pdf ? absoluteSiteUrl(issue.pdf) : "";
  return {
    "@context": "https://schema.org",
    "@type": "ComicIssue",
    name: `Planet-Man: ${issue.title}`,
    headline: `Planet-Man: ${issue.title}`,
    issueNumber: issue.number,
    description: issueDescription(issue),
    image: imageUrl,
    url: shareUrl,
    inLanguage: "en",
    isAccessibleForFree: true,
    isPartOf: {
      "@type": "CreativeWorkSeries",
      name: "Planet-Man Comics",
      url: `${SITE_ROOT}/web-app/`,
    },
    publisher: {
      "@type": "Organization",
      name: "Planet-Man Comics",
      url: `${SITE_ROOT}/web-app/`,
    },
    associatedMedia: [
      {
        "@type": "ImageObject",
        contentUrl: imageUrl,
        name: `Planet-Man: ${issue.title} cover`,
      },
      ...(pdfUrl
        ? [
            {
              "@type": "MediaObject",
              contentUrl: pdfUrl,
              encodingFormat: "application/pdf",
              name: `Planet-Man: ${issue.title} PDF`,
            },
          ]
        : []),
    ],
  };
}

function collectionStructuredData(catalog) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Planet-Man Comics Issue Archive",
    description: "A static archive of Planet-Man comic issue pages, cover art, browser-reader links, and PDFs.",
    url: `${SITE_ROOT}/web-app/issues/`,
    isPartOf: {
      "@type": "WebSite",
      name: "Planet-Man Comics",
      url: `${SITE_ROOT}/web-app/`,
    },
    hasPart: catalog.map((issue) => ({
      "@type": "ComicIssue",
      name: `Planet-Man: ${issue.title}`,
      issueNumber: issue.number,
      url: `${SITE_ROOT}/web-app/issues/${encodeURIComponent(issue.slug)}/`,
    })),
  };
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

function escapeScriptJson(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
