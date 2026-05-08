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
  applyHashState();
  if (!state.selectedSlug && state.catalog.length) {
    state.selectedSlug = state.catalog.at(-1).slug;
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
    applyHashState();
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
    const button = document.createElement("button");
    button.type = "button";
    button.className = `issue-card${issue.slug === selected?.slug ? " active" : ""}`;
    button.setAttribute("aria-label", `Open ${issue.title}`);
    button.innerHTML = `
      <img class="issue-cover" src="${issue.cover}" alt="">
      <span class="issue-meta">
        <span class="issue-number">Issue ${issue.number}</span>
        <span class="issue-name">${issue.title}</span>
        <span class="issue-detail">${issue.pages.length} pages</span>
      </span>
    `;
    button.addEventListener("click", () => {
      selectIssue(issue.slug, 0);
      document.querySelector("#reader").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    elements.issueList.append(button);
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
  updateButtons(issue);
  updateMode();
  updateHash();
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
  elements.previousIssueButton.disabled = issueIndex <= 0;
  elements.nextIssueButton.disabled = issueIndex >= state.catalog.length - 1;
  elements.previousPageButton.disabled = state.selectedPage <= 0;
  elements.nextPageButton.disabled = state.selectedPage >= issue.pages.length - 1;
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

function applyHashState() {
  const params = new URLSearchParams(location.hash.replace(/^#/, ""));
  const slug = params.get("issue");
  const page = Number.parseInt(params.get("page") || "1", 10) - 1;
  if (slug) state.selectedSlug = slug;
  if (Number.isFinite(page)) state.selectedPage = Math.max(0, page);
}

function updateHash() {
  const nextHash = `issue=${state.selectedSlug}&page=${state.selectedPage + 1}`;
  if (location.hash.slice(1) !== nextHash) {
    history.replaceState(null, "", `#${nextHash}`);
  }
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
