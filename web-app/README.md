# Planet-Man Comics Web App

This directory is a static browser reader for the Planet-Man Comics repository.

Open `web-app/index.html` through a local static server, or publish the repository with the included GitHub Pages workflow and visit:

```text
https://jetblackrlsh.github.io/Planet-Man-Comics/web-app/
```

The app reads `comics.json` first so it works as a plain static site. When hosted on `github.io`, it also asks the GitHub repository tree for current `intro-issue` and `issue-*` folders, so new issues that follow the existing `assets/comic-pages/page-*.png` convention can appear without changing the app code.

The Bonus page is available at:

```text
https://jetblackrlsh.github.io/Planet-Man-Comics/web-app/bonus/
```

The Follow page is available at:

```text
https://jetblackrlsh.github.io/Planet-Man-Comics/web-app/follow/
```

It embeds the follow.it email subscription form for new comic release updates.

The AI Limitations page is available at:

```text
https://jetblackrlsh.github.io/Planet-Man-Comics/web-app/ai-limitations/
```

It explains that the comics and stories use AI as part of the creative process
and intentionally retain visible AI mistakes, inconsistencies, and clarity
issues.

The Bonus page reads `bonus-data.json` as a static fallback. On `github.io`, it
also fetches the live `Planet-Man Series Guide.md` from `main` and discovers
tracked `Reference Images/` assets from the GitHub tree, then loads gallery
thumbnails from `raw.githubusercontent.com` so new reference images can appear
after they are committed and pushed.

Share a specific issue with a static preview page:

```text
https://jetblackrlsh.github.io/Planet-Man-Comics/web-app/issues/issue-15-circuit-divinity/
```

Those issue pages are static HTML files with Open Graph and Twitter preview tags that point at each issue cover. Browser visitors are sent into the reader for the selected issue.

To refresh the checked-in catalog after adding issues:

```sh
node web-app/scripts/build-catalog.mjs
node web-app/scripts/build-bonus-data.mjs
node web-app/scripts/build-share-pages.mjs
node web-app/scripts/build-seo.mjs
```

`build-bonus-data.mjs` checks that `Planet-Man Series Guide.md` has an issue
section for every `intro-issue` / `issue-*` folder before writing the generated
Bonus data.

`build-seo.mjs` writes the root `sitemap.xml`, `rss.xml`, and `robots.txt`
files used by search engines and feed readers. The RSS feed lists each issue
from `comics.json` newest-first, so future issues appear automatically after
the catalog and SEO build scripts run.
