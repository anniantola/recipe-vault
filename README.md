# Recipe Vault v16

Local-first recipe library, pantry matcher and shopping list for GitHub Pages.

## v16 overhaul

- Normalized recipe model: description, yield, timings, oven temperature, ingredients, steps, equipment, notes/tips, nutrition and source are separate fields.
- Explicit taxonomy: recipe type, cuisine, dietary labels and traits no longer compete for one category field.
- Source-specific import pipeline: JSON-LD/recipe-card websites, PDF text + OCR fallback, image OCR, video-frame OCR and pasted text all converge to one RecipeDraft format.
- Import validation: every imported draft gets a quality score and specific review warnings before saving.
- PDF text-quality detection: broken glyph text triggers rendered-page OCR instead of being trusted.
- Structured mobile editor: ingredient amount/unit/name/note/optional fields, ingredient sections, reorderable steps and separate equipment/nutrition fields.
- Duplicate detection by normalized source URL or file SHA-256.
- Pantry matching weights main ingredients more heavily than staples and distinguishes "ready", "missing only staples" and "missing main ingredients".
- Built-in cover presets by recipe type; no embedded SVG needs to be saved in every recipe.
- Compact JSON backup contains recipes/settings only. Full ZIP backup stores `recipes.json` and binary media separately under `/media`.
- Existing v1-v15 recipes and legacy JSON backups are migrated on load/import.

## Files

All app files remain in the repository root:

- `index.html`
- `app.js`
- `recipe-core.js`
- `styles.css`
- `manifest.webmanifest`
- `sw.js`
- `icon-192.png`
- `icon-512.png`

Keep the GitHub Pages deployment workflow (`.github/workflows/deploy.yml`) separate, as in the other apps.

## Deployment

Upload/replace the root files, commit to `main`, and keep GitHub Pages configured to **GitHub Actions**. The existing deployment workflow does not need to change.
