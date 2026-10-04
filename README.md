# Recipe Vault

A mobile-first, local-first PWA for collecting recipes from text, websites, images, PDFs and downloaded videos/Reels; matching recipes against ingredients on hand; and building a shopping list.

## Features

- Recipe library with search, source filters, favorites, tags and categories
- Text recipe parsing
- Website import through Jina Reader fallback
- PDF text extraction and first-page thumbnail (PDF.js loaded on demand)
- Image OCR (Tesseract.js loaded on demand)
- Video/Reel frame OCR with generated thumbnail
- Android PWA share target for shared images/videos/PDFs/URLs
- Editable review screen before saving imported recipes
- Fuzzy ingredient normalization/matching
- "What can I make?" ranking from typed ingredients + pantry
- Pantry ingredients automatically excluded from recipe-to-shopping import
- Shopping list merging, manual unrelated items, check-off, delete, and "move home"
- IndexedDB storage for recipes and media
- JSON export/import with optional embedded media
- PWA installation and offline app shell
- True-black dark mode

## Notes

- Your recipe library, pantry and shopping list are stored locally in IndexedDB on the device/browser.
- OCR dependencies are loaded from a CDN the first time they are needed.
- Website import may send the URL to Jina Reader to bypass cross-origin restrictions.
- Video OCR reads visible text from sampled frames; a spoken-only recipe with no captions/on-screen text cannot be transcribed by a static GitHub Pages app without adding a cloud speech/AI service.

## GitHub Pages deployment

This project deploys through GitHub Actions, matching the deployment setup used by the related tracker apps.

1. Upload the repository contents, including `.github/workflows/deploy.yml`, to the `main` branch.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab and confirm **Deploy Recipe Vault to GitHub Pages** completes successfully.
5. Future pushes to `main` redeploy automatically.
