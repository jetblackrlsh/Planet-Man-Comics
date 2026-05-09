const state = {
  gallery: [],
  query: "",
};

const REPOSITORY = {
  owner: "jetblackrlsh",
  name: "Planet-Man-Comics",
  branch: "main",
};

const elements = {
  guideContent: document.querySelector("#guideContent"),
  gallery: document.querySelector("#referenceGallery"),
  gallerySearch: document.querySelector("#gallerySearch"),
  galleryStatus: document.querySelector("#galleryStatus"),
  galleryCount: document.querySelector("#galleryCount"),
  dialog: document.querySelector("#referenceDialog"),
  dialogImage: document.querySelector("#referenceDialogImage"),
  dialogNumber: document.querySelector("#referenceDialogNumber"),
  dialogTitle: document.querySelector("#referenceDialogTitle"),
  dialogPrompt: document.querySelector("#referenceDialogPrompt"),
  closeDialog: document.querySelector("#closeReferenceDialog"),
};

init();

async function init() {
  wireEvents();

  try {
    const response = await fetch("./bonus-data.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Bonus data request failed: ${response.status}`);
    const data = await response.json();
    const guideMarkdown = await fetchLiveGuideMarkdown(data.guideMarkdown || "");
    state.gallery = await fetchLiveReferenceGallery(data.gallery || []);
    elements.guideContent.innerHTML = markdownToHtml(guideMarkdown);
    renderGallery();
  } catch (error) {
    elements.guideContent.innerHTML = `<p class="empty-state">Bonus content is unavailable.</p>`;
    elements.gallery.innerHTML = `<p class="empty-state">Reference images are unavailable.</p>`;
    elements.galleryStatus.textContent = "Bonus content unavailable";
    elements.galleryCount.textContent = "Unavailable";
    console.warn(error);
  }
}

async function fetchLiveGuideMarkdown(seedGuideMarkdown) {
  if (!location.hostname.endsWith("github.io")) return seedGuideMarkdown;

  try {
    const url = rawGitHubUrl("Planet-Man Series Guide.md");
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Live guide request failed: ${response.status}`);
    return response.text();
  } catch (error) {
    console.warn(error);
    return seedGuideMarkdown;
  }
}

async function fetchLiveReferenceGallery(seedGallery) {
  if (!location.hostname.endsWith("github.io")) return seedGallery;

  try {
    const url = `https://api.github.com/repos/${REPOSITORY.owner}/${REPOSITORY.name}/git/trees/${REPOSITORY.branch}?recursive=1`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`GitHub tree request failed: ${response.status}`);
    const payload = await response.json();
    const liveGallery = liveReferenceImages(payload.tree || [], seedGallery);
    return liveGallery.length ? liveGallery : seedGallery;
  } catch (error) {
    console.warn(error);
    return seedGallery;
  }
}

function liveReferenceImages(tree, seedGallery) {
  const seedByFile = new Map(seedGallery.map((item) => [item.file, item]));

  return tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path.match(/^Reference Images\/([^/]+\.(?:png|jpe?g|webp))$/i))
    .filter(Boolean)
    .map((match) => {
      const [, file] = match;
      const seed = seedByFile.get(file) || {};
      return {
        title: seed.title || titleFromFile(file),
        number: seed.number || file.match(/^(\d+)/)?.[1] || "",
        src: rawGitHubUrl(`Reference Images/${file}`),
        file,
        promptTitle: seed.promptTitle || "",
        prompt: seed.prompt || "",
      };
    })
    .sort((a, b) => sortReference(a).localeCompare(sortReference(b), undefined, { numeric: true }));
}

function wireEvents() {
  elements.gallerySearch.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderGallery();
  });

  elements.closeDialog.addEventListener("click", () => elements.dialog.close());
  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
  });
}

function renderGallery() {
  const visibleImages = state.gallery.filter((item) => {
    const haystack = `${item.number} ${item.title} ${item.file} ${item.promptTitle} ${item.prompt}`.toLowerCase();
    return haystack.includes(state.query);
  });

  elements.gallery.innerHTML = "";
  elements.galleryCount.textContent = `${visibleImages.length} images`;
  elements.galleryStatus.textContent = state.query
    ? `${visibleImages.length} matching images`
    : `${state.gallery.length} reference images`;

  if (!visibleImages.length) {
    elements.gallery.innerHTML = `<p class="empty-state">No matching reference images.</p>`;
    return;
  }

  for (const item of visibleImages) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reference-card";
    button.setAttribute("aria-label", `Open ${item.title}`);
    button.innerHTML = `
      <img src="${item.src}" alt="${escapeAttribute(item.title)}" loading="lazy">
      <span class="reference-meta">
        <span class="reference-number">${escapeHtml(item.number || "00")}</span>
        <span class="reference-title">${escapeHtml(item.title)}</span>
      </span>
    `;
    button.addEventListener("click", () => openReference(item));
    elements.gallery.append(button);
  }
}

function openReference(item) {
  elements.dialogImage.src = item.src;
  elements.dialogImage.alt = item.title;
  elements.dialogNumber.textContent = item.number ? `Reference ${item.number}` : "Reference";
  elements.dialogTitle.textContent = item.title;
  elements.dialogPrompt.textContent = item.prompt || item.file;
  elements.dialog.showModal();
}

function rawGitHubUrl(repoPath) {
  const encodedPath = repoPath.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${REPOSITORY.owner}/${REPOSITORY.name}/${REPOSITORY.branch}/${encodedPath}`;
}

function sortReference(item) {
  return `${String(item.number || "").padStart(4, "0")}-${item.file}`;
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

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let list = [];
  let table = [];

  for (const line of lines) {
    if (line.startsWith("|")) {
      flushParagraph();
      flushList();
      table.push(line);
      continue;
    }

    flushTable();

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length + 1, 5);
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const listItem = line.match(/^-\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      list.push(`<li>${inlineMarkdown(listItem[1])}</li>`);
      continue;
    }

    if (list.length && /^\s{2,}\S/.test(line)) {
      list[list.length - 1] = list[list.length - 1].replace("</li>", ` ${inlineMarkdown(line.trim())}</li>`);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushTable();

  return html.join("\n");

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    html.push(`<ul>${list.join("")}</ul>`);
    list = [];
  }

  function flushTable() {
    if (!table.length) return;
    html.push(markdownTableToHtml(table));
    table = [];
  }
}

function markdownTableToHtml(rows) {
  const parsedRows = rows
    .map((row) =>
      row
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim()),
    )
    .filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));

  if (!parsedRows.length) return "";
  const [headers, ...bodyRows] = parsedRows;
  const head = headers.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("");
  const body = bodyRows
    .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`)
    .join("");

  return `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
