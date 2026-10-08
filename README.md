# Recipe Vault v31

Mobile-first local recipe PWA for GitHub Pages.

## v31
- Recipe saves, Pantry additions and Shopping additions no longer wait for network translation. Data is stored immediately and missing translations are filled in as background derived data.
- Background recipe translation is guarded by the recipe `updatedAt` value, so an older translation job cannot overwrite a newer edit.
- App updates no longer force-reload an open session. New service workers wait until existing Recipe Vault windows are closed, then activate on the next clean launch.
- Backup Merge now compares recipe `updatedAt` timestamps. The newer recipe content wins; an exact tie preserves the current local recipe. Available media is retained from either copy where possible.
- Settings now includes **Manage custom tags**. Custom Type, Cuisine, Dietary and Trait values can be renamed or deleted. Rename/delete is applied to every recipe using that custom tag and translations refresh in the background.

The compact recipe schema remains v22 because these changes do not require a new recipe-record format.

Upload the 12 root files to the existing GitHub Pages repository and keep the existing `.github/workflows/deploy.yml` unchanged.
