# Planet-Man Comics Web App

This directory is a static browser reader for the Planet-Man Comics repository.

Open `web-app/index.html` through a local static server, or publish the repository with the included GitHub Pages workflow and visit:

```text
https://jetblackrlsh.github.io/Planet-Man-Comics/web-app/
```

The app reads `comics.json` first so it works as a plain static site. When hosted on `github.io`, it also asks the GitHub repository tree for current `intro-issue` and `issue-*` folders, so new issues that follow the existing `assets/comic-pages/page-*.png` convention can appear without changing the app code.

To refresh the checked-in catalog after adding issues:

```sh
node web-app/scripts/build-catalog.mjs
```
