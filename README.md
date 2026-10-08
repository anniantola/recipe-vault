# Recipe Vault v32

Mobile-first local recipe PWA for GitHub Pages.

## v32 reliability pass
- Stored recipe media now uses one cached `blob:` URL per media ID instead of creating a new object URL on every card/detail render. URLs are revoked when media is deleted, replaced, restored, or all app data is cleared.
- Recipe editing now has a lightweight local autosaved draft. Text, taxonomy, ingredients, steps, rating, notes and cover changes are periodically saved while editing. After a reload/app restart, Recipe Vault offers to resume the unfinished edit; a normal Save or Delete clears the recovery draft.
- File importing now uses a real sequential queue. Multiple selected/shared files are processed one at a time, and each recipe still opens for review before the next queued file begins. Failed files are skipped and the queue continues.
- Replacing recipe media is safer: an existing saved cover/source is not deleted until the edited recipe has actually been saved.

The compact recipe schema remains v22 because these are runtime/reliability changes rather than recipe-record format changes.

Upload the 12 root files to the existing GitHub Pages repository and keep the existing `.github/workflows/deploy.yml` unchanged.
