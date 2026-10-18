# Preset Extractor

A small mobile web app that pulls only the Lightroom preset files (`.dng`, `.xmp`, `.lrtemplate`)
out of downloaded preset zips (e.g. Presetpro packs), skipping PDFs, `.DS_Store` and `__MACOSX` files.

## Use
1. Open `index.html` from any static host (GitHub Pages, Vercel, Netlify) on your phone.
2. Optional: "Add to Home Screen" so it works like an app (and offline).
3. Tap **Choose zip files**, select one or more preset zips.
4. Tap **Send to Lightroom** (share sheet), or **Save as one zip**.

In Lightroom mobile, DNG presets import as photos: open one → **…** → **Create Preset**.
XMP presets: **Presets → … → Import Presets**.

Everything runs in the browser; no files are uploaded anywhere.
