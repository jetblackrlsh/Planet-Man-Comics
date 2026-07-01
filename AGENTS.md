# Planet-Man Comics Agent Instructions

When creating or completing a new issue:

- Craft the story so it is incredibly clear and easy to understand.
  - Do not make the reader infer what the story is about or what is happening.
  - Keep the story obvious to the reader, not ambiguous or overly complicated.
  - Prefer long captions when they communicate more information and make the
    story clearer and easier to understand.
- Add or update the issue entry in `Planet-Man Series Guide.md`.
  - Update the `Issue Index` row.
  - Add a `## Issue N: Planet-Man: Title` section with status, location, PDF,
    summary, relevant characters, series elements, and ongoing threads.
- Refresh the web app generated files:
  - `node web-app/scripts/build-catalog.mjs`
  - `node web-app/scripts/build-bonus-data.mjs`
  - `node web-app/scripts/build-share-pages.mjs`
  - `node web-app/scripts/build-seo.mjs`
- Verify the Bonus page after changes. The deployed `github.io` page live-loads
  the latest series guide markdown and discovers tracked `Reference Images/*`
  assets from the GitHub tree.

When adding reference images:

- Save final assets in `Reference Images/` with stable numbered filenames.
- Register each image in `Reference Images/reference-image-prompts.md`.
- Run `node web-app/scripts/build-bonus-data.mjs` so local/static Bonus data has
  the latest prompt metadata.
- On GitHub Pages, new tracked reference images should appear automatically in
  the Bonus gallery because `web-app/bonus.js` merges the live GitHub tree with
  the checked-in metadata.
