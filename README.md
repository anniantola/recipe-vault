# Recipe Vault v17

A local-first recipe PWA for GitHub Pages. Keep your existing `.github/workflows/deploy.yml`; it is not included here.

## v17 reliability pass

- Split persistent storage into `storage.js` and structured import/repair logic into `recipe-import.js`.
- Added one default `RecipeDraft` shape used by manual recipes and structured website imports.
- Website JSON-LD now maps directly into that draft instead of being flattened through the generic text parser first.
- Added conservative automatic repair for missing oven temperature, cook/bake time, servings, and total time. Explicit source/user values are never overwritten.
- Import review shows which fields were recovered automatically.
- Pasta shapes classify as Pasta without automatically implying Italian cuisine; Italian cuisine needs an actual Italian signal or source metadata.
- PDF corruption detection/OCR fallback, compact JSON/full ZIP backups, structured editor, pantry-first matching, duplicate detection and cover presets from v16 remain.
- Schema/cache version: 17.

## Files

Upload all files in this ZIP to the repository root. The app uses:

- `index.html`
- `app.js`
- `recipe-core.js`
- `recipe-import.js`
- `storage.js`
- `styles.css`
- `manifest.webmanifest`
- `sw.js`
- `icon-192.png`
- `icon-512.png`

The deployment workflow is intentionally not included.
