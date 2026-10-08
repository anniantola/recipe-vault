# Recipe Vault v30

Mobile-first local recipe PWA for GitHub Pages.

## v30
- Prevents the light/white flash during reload in dark mode by resolving the theme in the document head before the main stylesheet and app code paint.
- Mirrors only the theme preference (`system`, `dark`, or `light`) to localStorage so startup can resolve it synchronously. Recipe data remains in IndexedDB.
- Keeps the system-theme fallback for users who have not explicitly chosen light or dark.
- Preserves the existing reusable custom taxonomy/tag behavior.

The compact recipe schema remains v22 because recipe records did not change.

Upload the 12 root files to the existing GitHub Pages repository and keep the existing `.github/workflows/deploy.yml` unchanged.
