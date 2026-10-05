# MEMRISYS 2026 — per-photo titles and notes

Every photo now supports its own editable metadata, whether it is attached to a talk/poster or still Unclassified.

## Photo viewer
Open any photo and you can edit:
- **Photo title**
- **Photo notes**

Both fields autosave to that specific image.

## Gallery
Custom photo titles and short photo-note previews appear under thumbnails when present. Presentation grouping is unchanged.

## PPTX export
Photos remain on the correct topic-specific slides. A custom photo title is used as the photo caption, and photo notes are included beneath the corresponding image.

Service-worker cache: v19.

## Deployment
Replace:
- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`

`README.md` is optional.
