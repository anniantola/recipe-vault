# Recipe Vault v28

Mobile-first local recipe PWA for GitHub Pages.

## v28
- Recipe **Type** is now multi-select, matching Cuisine, Dietary and Traits.
- A recipe can belong to several types at once (for example `Pasta + Main` or `Dessert + Baking`).
- Type filters match any selected recipe type.
- Recipe cards and detail views show multiple type tags.
- Existing single-type recipes migrate automatically.
- Compact backup schema is v22 and preserves the full type list while keeping the primary `type` field for backward compatibility.

Upload the 12 root files to the existing GitHub Pages repository and keep the existing `.github/workflows/deploy.yml` unchanged.
