# Recipe Vault v29

Mobile-first local recipe PWA for GitHub Pages.

## v29
- Custom Type, Cuisine, Dietary and Trait values become reusable editor toggles automatically.
- Built-in taxonomy chips remain first; user-created values are added after them and sorted alphabetically.
- A custom value typed into the current editor appears as a toggle immediately, and is persisted to the reusable taxonomy when the recipe is saved.
- Existing custom tags already present in the recipe library are discovered automatically on upgrade.
- The custom taxonomy registry is included in JSON/ZIP backups and merged safely during Merge restore.
- Deleting or removing a tag from one recipe does not erase the reusable custom toggle.

The compact recipe schema remains v22 because recipe records themselves did not change.

Upload the 12 root files to the existing GitHub Pages repository and keep the existing `.github/workflows/deploy.yml` unchanged.
