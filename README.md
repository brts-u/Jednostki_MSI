# MSI Warszawa — geoportal odwiedzonych obszarów

A small static map site: click a neighborhood polygon to mark it as visited.
Built with [Leaflet](https://leafletjs.com/) + OpenStreetMap tiles. No backend —
visited status is saved in your own browser's `localStorage`, so it's private
to you and persists between visits on the same device/browser (until you clear
site data). Use the **Eksportuj / Importuj** buttons to back up or move your
progress to another browser.

## Files

```
index.html          the page
styles.css           styling
app.js                map logic (loading data, click-to-toggle, search, export/import)
data/MSI.geojson      your polygon data (name + fid used per feature)
```

## Run it locally

Opening `index.html` directly by double-clicking it won't work — browsers
block `fetch()` of local files under `file://`. Serve the folder instead, e.g.:

```bash
cd msi-geoportal
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy to GitHub Pages

1. Create a new GitHub repository (or use an existing one) and push this
   folder's contents to it:

   ```bash
   cd msi-geoportal
   git init
   git add .
   git commit -m "Initial geoportal"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Pick branch `main`, folder `/ (root)`, and save.
5. After a minute or two your site will be live at:
   `https://<your-username>.github.io/<your-repo>/`

## Notes / things you might want to tweak

- **Data**: `data/MSI.geojson` is used as-is (142 features, `name` +
  `fid` fields). If you regenerate this file, keep a stable, unique `fid`
  per polygon — that's the key visited-status is stored against.
- **Language**: UI text is in Polish to match the neighborhood names; happy
  to translate it to English if you'd rather.
- **Shared/multi-device visited list**: right now "visited" is per-browser
  only (as requested). If you ever want the same list to follow you across
  devices or be visible to other people, that needs a small backend (e.g. a
  free Firebase project, or a GitHub-Gist-backed store) — let me know and I
  can wire that up.
