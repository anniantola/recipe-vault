# Recipe Vault v21

Recipe Vault is a local-first, installable recipe library for GitHub Pages.

## v21

- Oven temperatures are normalized to compact units: e.g. `180 Celsius` / `180 degrees Celsius` → `180°C`, and `350 Fahrenheit` → `350°F`. Existing recipes are normalized on load as well as new imports/edits.

- Normalizes capitalization consistently across English, Finnish, and Italian by field type without changing stored source wording.

- Recipe content is multilingual, not just the interface. New/edited recipes are translated between English, Finnish and Italian when saved.
- Recipe titles, descriptions, servings/yield text, type/cuisine/dietary/traits, ingredient section names, ingredient units/names/notes, instructions, equipment, notes and nutrition text can switch with the app language.
- Pantry items, temporary ingredients and manual/recipe shopping-list items are translated to all three languages when added.
- Recipe search searches the original and translated text, so a Finnish search can find an English-imported recipe after translation.
- Pantry matching can compare stored ingredient translations across EN/FI/IT, so the same ingredient can still match when the recipe and pantry were entered in different languages.
- The original recipe/source wording remains the authoritative saved recipe. Machine translations are stored separately; unchanged fields keep their existing translations when a recipe is edited.
- Existing v17 and older recipes/items are backfilled in the background; if translation is temporarily unavailable, the original text is shown and Recipe Vault retries later.
- Common recipe vocabulary is translated locally. Free-text translation requires an internet connection and sends only the text that still needs translation to an external service. Generated translations are cached locally and included in backups.

## Files

Upload all files in this package to the root of the existing GitHub Pages repository. Keep the repository's existing `.github/workflows/deploy.yml` unchanged.

The app remains framework-free and stores recipes/media locally in IndexedDB. Compact JSON backups omit media blobs; full ZIP backups include stored media separately.


### Stable translations
- Common EN/FI/IT recipe vocabulary is translated locally and deterministically.
- Remote translations are cached in a local translation memory.
- Recipe translations use per-field hashes, so editing one field does not retranslate unchanged fields.
- A localized recipe is only shown when that language version is complete; otherwise the original is shown.
- Existing v18 translations are reused where possible, while common vocabulary is normalized to the local dictionary.
