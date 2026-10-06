# Recipe Vault v18

Recipe Vault is a local-first, installable recipe library for GitHub Pages.

## v18

- Recipe content is multilingual, not just the interface. New/edited recipes are translated between English, Finnish and Italian when saved.
- Recipe titles, descriptions, servings/yield text, type/cuisine/dietary/traits, ingredient section names, ingredient units/names/notes, instructions, equipment, notes and nutrition text can switch with the app language.
- Pantry items, temporary ingredients and manual/recipe shopping-list items are translated to all three languages when added.
- Recipe search searches the original and translated text, so a Finnish search can find an English-imported recipe after translation.
- Pantry matching can compare stored ingredient translations across EN/FI/IT, so the same ingredient can still match when the recipe and pantry were entered in different languages.
- The original recipe/source wording remains the authoritative saved recipe. Machine translations are stored separately and refreshed when the recipe is edited.
- Existing v17 and older recipes/items are backfilled in the background; if translation is temporarily unavailable, the original text is shown and Recipe Vault retries later.
- Translation requires an internet connection and sends the text being translated to an external translation service. Generated translations are cached locally and included in backups.

## Files

Upload all files in this package to the root of the existing GitHub Pages repository. Keep the repository's existing `.github/workflows/deploy.yml` unchanged.

The app remains framework-free and stores recipes/media locally in IndexedDB. Compact JSON backups omit media blobs; full ZIP backups include stored media separately.
