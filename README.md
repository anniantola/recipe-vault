# Recipe Vault v23

A local-first recipe library PWA for GitHub Pages.

## v23 data cleanup and restore safety

- Keeps application version and recipe schema version separate in new backups (`appVersion`, `schemaVersion`).
- Migrates legacy broad `Dinner` recipes when a stronger type is evident (for example spaghetti -> Pasta).
- Translation engine v23 revalidates legacy translations against the deterministic EN/FI/IT recipe vocabulary.
- Units are controlled vocabulary and are never sent to the generic translator.
- Corrects ambiguous food vocabulary such as honey and orange using deterministic recipe translations.
- Shared translation cache is now only for Pantry / temporary / Shopping text; duplicated recipe-ingredient cache entries are pruned.
- Website import extracts WPRM/HTML author, servings, description, image and nutrition metadata when JSON-LD is unavailable.
- Invalid nutrition fields containing only a recipe title/source URL are discarded.
- Backup import now shows a preflight summary and offers Merge, Replace, or Cancel.
- ZIP restore reports missing media and clears unusable media references on Replace; Merge preserves matching media already on the device when possible.

## Backup formats

**Compact JSON** contains recipes, translations, pantry, shopping and settings without local image/PDF/video blobs.

**Full ZIP** contains `recipes.json`, `media-index.json`, and the actual locally stored media in `media/`.

Keep the existing GitHub Pages workflow (`.github/workflows/deploy.yml`) unchanged when updating the app files.
