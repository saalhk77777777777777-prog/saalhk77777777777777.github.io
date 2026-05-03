# Skybox Studio

## Files

- `index.html`: app markup
- `styles.css`: app styles
- `app.js`: editor logic
- `run-local.ps1`: local web server launcher

## Run

```powershell
powershell -ExecutionPolicy Bypass -File .\run-local.ps1
```

Then open:

`http://127.0.0.1:4173/index.html`

## Notes

- The original single-file version remains separate as `skybox.html`.
- AI recommendation works best when this app is opened through the local server instead of `file://`.
