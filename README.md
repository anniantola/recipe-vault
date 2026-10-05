# Recipe Vault

Local-first recipe library PWA for GitHub Pages.

## Features
- Import recipes from pasted text, websites, PDFs, photos and downloaded videos/Reels.
- OCR supports English, Finnish and Italian.
- Recipe parsing recognizes English, Finnish and Italian headings, units and common ingredient synonyms.
- UI language can be switched between English, Finnish and Italian in Settings.
- Parsed extra information is saved into Notes / extra information instead of being discarded.
- Fuzzy ingredient matching and pantry-aware recipe suggestions.
- Shopping list from recipe ingredients plus manual shopping items.
- IndexedDB storage, JSON backup/restore, offline app shell and Android PWA share target.

## Deployment
Upload the app files to the repository root. Add the deployment workflow separately as `.github/workflows/deploy.yml`, then set GitHub Pages Source to **GitHub Actions**.
