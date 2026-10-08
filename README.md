# Recipe Vault v24

A local-first, installable recipe library for GitHub Pages.

## v24 star ratings

- Adds an optional 1–5 star rating to every recipe. Existing recipes remain unrated.
- Ratings can be set directly from the recipe detail view or in the recipe editor.
- Rated recipes show their stars on collection cards.
- Favorites remain a separate concept and now use a heart icon so they are not confused with ratings.
- Compact JSON and Full ZIP backups preserve ratings. The compact recipe schema is now version 20; older backups migrate with rating = unrated.
- All existing import, pantry, shopping, translation, backup and restore behavior is retained.

## Deployment

Upload the root files to the GitHub Pages repository and keep the existing `.github/workflows/deploy.yml` unchanged.
