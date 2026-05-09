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

It reads `bonus-data.json`, which contains the series guide markdown and the reference image gallery generated from `Reference Images/`.

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
```
