# MEMRISYS 2026 — photo details fix v20

This version makes the per-photo editing unmistakable and also bypasses the old cached app assets.

## What changed
Open **any** photo, including one already assigned to a talk or poster. Below the image/arrows there is now a visible **Photo details** panel containing:

- **Title**
- **Notes**
- the presentation/poster the photo is attached to
- autosave status

The fields are available for classified and Unclassified photos alike.

The Gallery still shows saved custom titles and short note previews under thumbnails.

The PPTX export keeps assigned photos under the correct presentation and includes each photo's custom title/notes.

## Cache fix
This release uses fresh asset URLs:
- `app-v20.js`
- `styles-v20.css`
- `service-worker-v20.js`

That avoids Android Chrome continuing to serve the earlier JavaScript/CSS files under the old filenames.

## Deployment
Replace:
- `index.html`

Add:
- `app-v20.js`
- `styles-v20.css`
- `service-worker-v20.js`

The old `app.js`, `styles.css`, and `service-worker.js` may remain in the repo; v20 no longer references them.
