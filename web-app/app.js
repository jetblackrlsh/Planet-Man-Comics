const REPOSITORY = {
  owner: "jetblackrlsh",
  name: "Planet-Man-Comics",
  branch: "main",
};

const state = {
  catalog: [],
  selectedSlug: "",
  selectedPage: 0,
  mode: "flow",
  query: "",
};

const SHARE_FEEDBACK_MS = 1600;

const elements = {
  status: document.querySelector("#catalogStatus"),
  issueList: document.querySelector("#issueList"),
  issueKicker: document.querySelector("#issueKicker"),
  issueTitle: document.querySelector("#issueTitle"),
  pageImage: document.querySelector("#pageImage"),
  pageCaption: document.querySelector("#pageCaption"),
  pageStage: document.querySelector("#pageStage"),
  flowReader: document.querySelector("#flowReader"),
  thumbnailRow: document.querySelector("#thumbnailRow"),
  searchInput: document.querySelector("#searchInput"),
  singleModeButton: document.querySelector("#singleModeButton"),
  flowModeButton: document.querySelector("#flowModeButton"),
  firstIssueButton: document.querySelector("#firstIssueButton"),
  latestIssueButton: document.querySelector("#latestIssueButton"),
  downloadIssueButton: document.querySelector("#downloadIssueButton"),
  shareIssueButton: document.querySelector("#shareIssueButton"),
  previousIssueButton: document.querySelector("#previousIssueButton"),
  nextIssueButton: document.querySelector("#nextIssueButton"),
  previousPageButton: document.querySelector("#previousPageButton"),
  nextPageButton: document.querySelector("#nextPageButton"),
};

init();

async function init() {
  wireEvents();
  const seedCatalog = await fetchSeedCatalog();
  state.catalog = await fetchLiveGitHubCatalog(seedCatalog);
  applyUrlState();
  if (!state.selectedSlug && state.catalog.length) {
    state.selectedSlug = state.catalog[0].slug;
  }
  render();
}

function wireEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderIssueList();
  });

  elements.singleModeButton.addEventListener("click", () => setMode("single"));
  elements.flowModeButton.addEventListener("click", () => setMode("flow"));
  elements.firstIssueButton.addEventListener("click", () => selectBoundaryIssue("first"));
  elements.latestIssueButton.addEventListener("click", () => selectBoundaryIssue("latest"));
  elements.shareIssueButton.addEventListener("click", () => {
    const issue = getSelectedIssue();
    if (issue) copyIssueLink(issue, state.selectedPage, elements.shareIssueButton);
  });
  elements.previousIssueButton.addEventListener("click", () => stepIssue(-1));
  elements.nextIssueButton.addEventListener("click", () => stepIssue(1));
  elements.previousPageButton.addEventListener("click", () => stepPage(-1));
  elements.nextPageButton.addEventListener("click", () => stepPage(1));

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea")) return;
    if (event.key === "ArrowLeft") stepPage(-1);
    if (event.key === "ArrowRight") stepPage(1);
    if (event.key === "ArrowUp") stepIssue(-1);
    if (event.key === "ArrowDown") stepIssue(1);
  });

  window.addEventListener("hashchange", () => {
    applyUrlState();
    render();
  });
}

async function fetchSeedCatalog() {
  try {
    const response = await fetch("./comics.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
    const catalog = await response.json();
    setStatus(`${catalog.length} issues`);
    return catalog;
  } catch (error) {
    setStatus("Catalog unavailable");
    console.warn(error);
    return [];
  }
}

async function fetchLiveGitHubCatalog(seedCatalog) {
  if (!location.hostname.endsWith("github.io")) return seedCatalog;

  try {
    const url = `https://api.github.com/repos/${REPOSITORY.owner}/${REPOSITORY.name}/git/trees/${REPOSITORY.branch}?recursive=1`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`GitHub tree request failed: ${response.status}`);
    const payload = await response.json();
    const merged = mergeGitHubTree(seedCatalog, payload.tree || []);
    setStatus(`${merged.length} issues, live`);
    return merged;
  } catch (error) {
    setStatus(`${seedCatalog.length} issues, local`);
    console.warn(error);
    return seedCatalog;
  }
}

function mergeGitHubTree(seedCatalog, tree) {
  const seededBySlug = new Map(seedCatalog.map((issue) => [issue.slug, issue]));
  const grouped = new Map();

  for (const item of tree) {
    if (item.type !== "blob") continue;
    const pageMatch = item.path.match(/^((?:intro-issue)|(?:issue-\d{2}-[^/]+))\/assets\/comic-pages\/(page-\d{2}(?:-cover)?\.png)$/);
    const pdfMatch = item.path.match(/^((?:intro-issue)|(?:issue-\d{2}-[^/]+))\/output\/pdf\/([^/]+\.pdf)$/);

    if (pageMatch) {
      const [, slug, file] = pageMatch;
      const issue = ensureIssue(grouped, seededBySlug, slug);
      issue.pages.push({
        label: labelForPage(file),
        src: `../${item.path}`,
      });
      if (file.includes("cover")) issue.cover = `../${item.path}`;
    }

    if (pdfMatch) {
      const [, slug] = pdfMatch;
      ensureIssue(grouped, seededBySlug, slug).pdf = `../${item.path}`;
    }
  }

  return [...grouped.values()]
    .map((issue) => ({
      ...issue,
      pages: issue.pages.sort((a, b) => pageNumber(a.src) - pageNumber(b.src)),
    }))
    .filter((issue) => issue.pages.length)
    .sort((a, b) => a.number - b.number);
}

function ensureIssue(grouped, seededBySlug, slug) {
  if (grouped.has(slug)) return grouped.get(slug);
  const seeded = seededBySlug.get(slug);
  const issue = seeded
    ? { ...seeded, pages: [] }
    : {
        slug,
        number: numberFromSlug(slug),
        title: titleFromSlug(slug),
        summary: "New Planet-Man issue discovered from the repository.",
        cover: "",
        pdf: "",
        pages: [],
      };
  grouped.set(slug, issue);
  return issue;
}

function render() {
  renderIssueList();
  renderReader();
}

function renderIssueList() {
  const selected = getSelectedIssue();
  const visibleIssues = state.catalog.filter((issue) => {
    const haystack = `${issue.number} ${issue.title} ${issue.slug} ${issue.summary}`.toLowerCase();
    return haystack.includes(state.query);
  });

  elements.issueList.innerHTML = "";
  if (!visibleIssues.length) {
    elements.issueList.innerHTML = `<p class="empty-state">No matching issues.</p>`;
    return;
  }

  for (const issue of visibleIssues) {
    const card = document.createElement("article");
    card.className = `issue-card${issue.slug === selected?.slug ? " active" : ""}`;

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "issue-open-button";
    openButton.setAttribute("aria-label", `Open ${issue.title}`);
    openButton.innerHTML = `
      <img class="issue-cover" src="${issue.cover}" alt="">
      <span class="issue-meta">
        <span class="issue-number">Issue ${issue.number}</span>
        <span class="issue-name">${issue.title}</span>
        <span class="issue-detail">${issue.pages.length} pages</span>
      </span>
    `;
    openButton.addEventListener("click", () => {
      selectIssue(issue.slug, 0);
      document.querySelector("#reader").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.className = "issue-share-button";
    shareButton.textContent = "Copy link";
    shareButton.dataset.defaultLabel = "Copy link";
    shareButton.setAttribute("aria-label", `Copy link to ${issue.title}`);
    shareButton.addEventListener("click", () => copyIssueLink(issue, 0, shareButton));

    card.append(openButton, shareButton);
    elements.issueList.append(card);
  }
}

function renderReader() {
  const issue = getSelectedIssue();
  if (!issue) return;

  state.selectedPage = clamp(state.selectedPage, 0, issue.pages.length - 1);
  const page = issue.pages[state.selectedPage];
  elements.issueKicker.textContent = `Issue ${issue.number} of ${state.catalog.length}`;
  elements.issueTitle.textContent = issue.title;
  elements.pageImage.src = page.src;
  elements.pageImage.alt = `${issue.title}, ${page.label}`;
  elements.pageCaption.textContent = `${page.label} / ${issue.pages.length} pages`;

  renderThumbnails(issue);
  renderFlow(issue);
  updateDownloadLink(issue);
  updateShareButton(issue);
  updateButtons(issue);
  updateMode();
  updateUrl();
}

function renderThumbnails(issue) {
  elements.thumbnailRow.innerHTML = "";
  issue.pages.forEach((page, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `thumb-button${index === state.selectedPage ? " active" : ""}`;
    button.setAttribute("aria-label", `Open ${page.label}`);
    button.innerHTML = `<img src="${page.src}" alt=""><span>${index + 1}</span>`;
    button.addEventListener("click", () => selectIssue(issue.slug, index));
    elements.thumbnailRow.append(button);
  });
}

function renderFlow(issue) {
  elements.flowReader.innerHTML = "";
  issue.pages.forEach((page, index) => {
    const figure = document.createElement("figure");
    figure.className = "flow-page";
    figure.innerHTML = `<img src="${page.src}" alt="${issue.title}, ${page.label}"><figcaption>${page.label}</figcaption>`;
    if (index === state.selectedPage) figure.id = "current-flow-page";
    elements.flowReader.append(figure);
  });
}

function updateButtons(issue) {
  const issueIndex = state.catalog.findIndex((item) => item.slug === issue.slug);
  elements.firstIssueButton.disabled = issueIndex <= 0;
  elements.latestIssueButton.disabled = issueIndex >= state.catalog.length - 1;
  elements.previousIssueButton.disabled = issueIndex <= 0;
  elements.nextIssueButton.disabled = issueIndex >= state.catalog.length - 1;
  elements.previousPageButton.disabled = state.selectedPage <= 0;
  elements.nextPageButton.disabled = state.selectedPage >= issue.pages.length - 1;
}

function updateDownloadLink(issue) {
  if (!issue.pdf) {
    elements.downloadIssueButton.hidden = true;
    elements.downloadIssueButton.removeAttribute("href");
    elements.downloadIssueButton.removeAttribute("download");
    return;
  }

  elements.downloadIssueButton.hidden = false;
  elements.downloadIssueButton.href = issue.pdf;
  elements.downloadIssueButton.download = filenameFromPath(issue.pdf);
  elements.downloadIssueButton.setAttribute("aria-label", `Download ${issue.title} as a PDF`);
}

function updateShareButton(issue) {
  elements.shareIssueButton.hidden = false;
  elements.shareIssueButton.dataset.defaultLabel = "Copy Link";
  elements.shareIssueButton.setAttribute("aria-label", `Copy link to ${issue.title}`);
}

async function copyIssueLink(issue, pageIndex, button) {
  const url = issueShareUrl(issue, pageIndex);
  const copied = await writeClipboardText(url);
  showCopyFeedback(button, copied ? "Copied" : "Copy failed");
}

async function writeClipboardText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn(error);
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  try {
    return document.execCommand("copy");
  } catch (error) {
    console.warn(error);
    return false;
  } finally {
    textarea.remove();
  }
}

function showCopyFeedback(button, label) {
  window.clearTimeout(Number(button.dataset.feedbackTimer || 0));
  const defaultLabel = button.dataset.defaultLabel || button.textContent || "Copy Link";
  button.textContent = label;
  button.classList.toggle("copy-failed", label === "Copy failed");
  button.dataset.feedbackTimer = String(
    window.setTimeout(() => {
      button.textContent = defaultLabel;
      button.classList.remove("copy-failed");
      delete button.dataset.feedbackTimer;
    }, SHARE_FEEDBACK_MS),
  );
}

function updateMode() {
  const isFlow = state.mode === "flow";
  elements.pageStage.hidden = isFlow;
  elements.flowReader.hidden = !isFlow;
  elements.singleModeButton.classList.toggle("active", !isFlow);
  elements.flowModeButton.classList.toggle("active", isFlow);
}

function setMode(mode) {
  state.mode = mode;
  updateMode();
}

function selectIssue(slug, pageIndex = 0) {
  state.selectedSlug = slug;
  state.selectedPage = pageIndex;
  render();
}

function stepIssue(direction) {
  const currentIndex = state.catalog.findIndex((issue) => issue.slug === state.selectedSlug);
  const nextIssue = state.catalog[currentIndex + direction];
  if (nextIssue) selectIssue(nextIssue.slug, 0);
}

function selectBoundaryIssue(position) {
  const issue = position === "first" ? state.catalog[0] : state.catalog.at(-1);
  if (issue) selectIssue(issue.slug, 0);
}

function stepPage(direction) {
  const issue = getSelectedIssue();
  if (!issue) return;
  const nextPage = state.selectedPage + direction;
  if (nextPage >= 0 && nextPage < issue.pages.length) selectIssue(issue.slug, nextPage);
}

function getSelectedIssue() {
  return state.catalog.find((issue) => issue.slug === state.selectedSlug) || state.catalog[0];
}

function setStatus(text) {
  elements.status.textContent = text;
}

function applyUrlState() {
  const pathMatch = location.pathname.match(/\/issues\/([^/]+)\/?(?:index\.html)?$/);
  if (pathMatch) state.selectedSlug = decodeURIComponent(pathMatch[1]);

  const params = new URLSearchParams(location.hash.replace(/^#/, ""));
  const slug = params.get("issue");
  const page = Number.parseInt(params.get("page") || "1", 10) - 1;
  if (slug) state.selectedSlug = slug;
  if (Number.isFinite(page)) state.selectedPage = Math.max(0, page);
}

function updateUrl() {
  const nextHash = `issue=${state.selectedSlug}&page=${state.selectedPage + 1}`;
  const nextPath = `${appPathPrefix()}issues/${encodeURIComponent(state.selectedSlug)}/`;
  const nextUrl = `${nextPath}#${nextHash}`;
  if (`${location.pathname}${location.hash}` !== nextUrl) {
    history.replaceState(null, "", nextUrl);
  }
}

function appPathPrefix() {
  const issuePathStart = location.pathname.indexOf("/issues/");
  if (issuePathStart !== -1) return location.pathname.slice(0, issuePathStart + 1);
  if (location.pathname.endsWith("/")) return location.pathname;
  return location.pathname.replace(/[^/]*$/, "");
}

function issueShareUrl(issue, pageIndex) {
  const path = `${appPathPrefix()}issues/${encodeURIComponent(issue.slug)}/`;
  const hash = `issue=${encodeURIComponent(issue.slug)}&page=${Math.max(0, pageIndex) + 1}`;
  return new URL(`${path}#${hash}`, location.origin).href;
}

function labelForPage(file) {
  const number = pageNumber(file);
  return number === 1 && file.includes("cover") ? "Cover" : `Page ${number}`;
}

function pageNumber(path) {
  const match = path.match(/page-(\d{2})/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function numberFromSlug(slug) {
  if (slug === "intro-issue") return 1;
  const match = slug.match(/^issue-(\d{2})-/);
  return match ? Number.parseInt(match[1], 10) : 999;
}

function titleFromSlug(slug) {
  if (slug === "intro-issue") return "First Orbit";
  return slug
    .replace(/^issue-\d{2}-/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function filenameFromPath(path) {
  const normalized = path.split("?")[0].split("#")[0];
  return normalized.split("/").filter(Boolean).at(-1) || "planet-man-comic.pdf";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
