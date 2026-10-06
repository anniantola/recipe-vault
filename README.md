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


## Measurements
Recipe amounts can be displayed in Metric or US customary units. Conversions are display-only; the original imported quantities remain stored unchanged.


## PDF import v7
PDF text is rebuilt from page coordinates before parsing, so headings, ingredients, wrapped instructions, notes and nutrition stay in visual reading order instead of being flattened into a single line. Recipe-export metadata and source URLs are also preserved when available.


## Recipe library v12
The Recipes page now always opens on All recipes and orders the collection by date added, newest first. Editing or favoriting a recipe does not change its position. Obsolete saved filters are reset automatically.


## v12
Fixes the recipe-library cold-start rendering race so Newest/A–Z/Favorites populate correctly immediately after reload.


## v12 structured recipe cards
Imports now store prep time, cook/bake time, rest/rise time, total time, servings and oven temperature as dedicated fields shown directly under the recipe title. PDF parsing was tightened using the Chocolate Panettone export as a regression case.
