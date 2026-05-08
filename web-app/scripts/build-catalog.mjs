import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const appRoot = path.resolve(repoRoot, "web-app");

const summaries = new Map([
  ["intro-issue", "Planet-Man's introductory issue."],
  ["issue-02-disastero", "Planet-Man faces an existential super-villain known as a walking apocalypse."],
  ["issue-03-scalard", "Planet-Man meets Scalard."],
  ["issue-04-madame-multiverse", "Madame Multiverse arrives as the villain."],
  ["issue-05-dream-reaper", "Planet-Man faces a threat inside a dream."],
  ["issue-06-shrink-scope-bank-heist", "Shrink-Scope's powers take focus during a bank-heist issue."],
  ["issue-07-everything-will-be-okay", "A quiet, emotionally charged Planet-Man issue."],
  ["issue-08-machine-monarch", "Machine Monarch enters Planet-Man's world."],
  ["issue-09-hoppette", "Planet-Man and Shrink-Scope return from a mission and meet Hoppette."],
  ["issue-10-blizzard-redesignation", "Blizzard steps into Planet-Man's ongoing story."],
  ["issue-11-lily-pad-lesson", "A new lesson expands Planet-Man's world."],
  ["issue-12-hop-incoming", "Hoppette's world pushes into the series."],
  ["issue-13-shock-step", "Shock-Step enters with electricity and speed."],
  ["issue-14-bruiser", "Bruiser brings heavy impact to Planet-Man's HQ."],
  ["issue-15-circuit-divinity", "Machine Monarch escapes into a living circuit world."],
]);

const entries = await readdir(repoRoot, { withFileTypes: true });
const issueDirs = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => name === "intro-issue" || /^issue-\d{2}-/.test(name))
  .sort((a, b) => numberFromSlug(a) - numberFromSlug(b));

const catalog = [];

for (const slug of issueDirs) {
  const pageDir = path.join(repoRoot, slug, "assets/comic-pages");
  const pdfDir = path.join(repoRoot, slug, "output/pdf");
  const pages = await readDirectorySafe(pageDir);
  const pageFiles = pages
    .filter((name) => /^page-\d{2}(?:-cover)?\.png$/.test(name))
    .sort((a, b) => pageNumber(a) - pageNumber(b));

  if (!pageFiles.length) continue;

  const pdfFiles = (await readDirectorySafe(pdfDir)).filter((name) => name.endsWith(".pdf"));
  const title = await titleForIssue(slug, pdfFiles[0]);

  catalog.push({
    slug,
    number: numberFromSlug(slug),
    title,
    summary: summaries.get(slug) || "Planet-Man issue discovered from the repository.",
    cover: `../${slug}/assets/comic-pages/${pageFiles[0]}`,
    pdf: pdfFiles[0] ? `../${slug}/output/pdf/${pdfFiles[0]}` : "",
    pages: pageFiles.map((file) => ({
      label: labelForPage(file),
      src: `../${slug}/assets/comic-pages/${file}`,
    })),
  });
}

await writeFile(path.join(appRoot, "comics.json"), `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${catalog.length} issues to web-app/comics.json`);

async function titleForIssue(slug, pdfFile) {
  if (slug === "intro-issue") return "First Orbit";
  if (pdfFile) return titleCase(pdfFile.replace(/^planet-man-/, "").replace(/\.pdf$/, ""));

  try {
    const story = await readFile(path.join(repoRoot, slug, "source/story-idea.txt"), "utf8");
    const firstLine = story.split("\n").find(Boolean) || "";
    const issueTitle = firstLine.match(/Issue\s+\d+:\s+(.+)/i);
    if (issueTitle) return issueTitle[1].trim();
  } catch {
    // Fall through to slug-derived title.
  }

  return titleCase(slug.replace(/^issue-\d{2}-/, ""));
}

async function readDirectorySafe(directory) {
  try {
    return await readdir(directory);
  } catch {
    return [];
  }
}

function labelForPage(file) {
  const number = pageNumber(file);
  return number === 1 && file.includes("cover") ? "Cover" : `Page ${number}`;
}

function pageNumber(file) {
  const match = file.match(/page-(\d{2})/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function numberFromSlug(slug) {
  if (slug === "intro-issue") return 1;
  const match = slug.match(/^issue-(\d{2})-/);
  return match ? Number.parseInt(match[1], 10) : 999;
}

function titleCase(value) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
