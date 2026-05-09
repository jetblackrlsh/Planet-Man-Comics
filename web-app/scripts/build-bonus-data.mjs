import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const appRoot = path.resolve(repoRoot, "web-app");
const referenceRoot = path.resolve(repoRoot, "Reference Images");

const guideMarkdown = await readFile(path.join(repoRoot, "Planet-Man Series Guide.md"), "utf8");
const promptMarkdown = await readFile(path.join(referenceRoot, "reference-image-prompts.md"), "utf8");
const promptEntries = parsePromptEntries(promptMarkdown);
const imageFiles = (await readdir(referenceRoot)).filter((file) => /\.(?:png|jpe?g|webp)$/i.test(file));

const gallery = imageFiles
  .map((file) => referenceImageEntry(file, promptEntries))
  .sort((a, b) => a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true }))
  .map(({ sortKey, ...entry }) => entry);

await writeFile(
  path.join(appRoot, "bonus-data.json"),
  `${JSON.stringify(
    {
      guideMarkdown,
      gallery,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote ${gallery.length} reference images to web-app/bonus-data.json`);

function parsePromptEntries(markdown) {
  const sections = [];
  const sectionPattern = /^##\s+(\d+)\.\s+(.+)$/gm;
  const matches = [...markdown.matchAll(sectionPattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    const bodyStart = match.index + match[0].length;
    const bodyEnd = next ? next.index : markdown.length;
    sections.push({
      number: match[1],
      title: match[2].trim(),
      prompt: markdown.slice(bodyStart, bodyEnd).trim(),
    });
  }

  return sections;
}

function referenceImageEntry(file, promptEntries) {
  const title = titleFromFile(file);
  const number = file.match(/^(\d+)/)?.[1] || "";
  const promptEntry = findPromptEntry(number, title, promptEntries);

  return {
    title,
    number,
    src: `../Reference%20Images/${encodeURIComponent(file)}`,
    file,
    promptTitle: promptEntry?.title || "",
    prompt: promptEntry?.prompt || "",
    sortKey: `${number.padStart(4, "0")}-${file}`,
  };
}

function findPromptEntry(number, title, promptEntries) {
  const numbered = promptEntries.filter((entry) => entry.number === number);
  if (!numbered.length) return null;
  if (numbered.length === 1) return numbered[0];

  const titleKey = normalize(title);
  return (
    numbered.find((entry) => {
      const promptKey = normalize(entry.title);
      return promptKey.includes(titleKey) || titleKey.includes(promptKey);
    }) || numbered[0]
  );
}

function titleFromFile(file) {
  return file
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+-/, "")
    .replace(/-v\d+$/i, "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(reference|image|character|series|logo)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
