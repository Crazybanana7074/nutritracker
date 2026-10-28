# NutriTracker PWA

## GitHub Pages deployment

Keep `index.html`, `manifest.json`, `sw.js`, `css/`, `js/`, and `icons/` together at the published site root. In GitHub, publish the branch/folder that contains these files. All local references are relative (`./...`) so they also work when GitHub Pages hosts the project below `https://<user>.github.io/<repository>/`.

## Existing data and migration

- The application deliberately keeps the existing `localStorage` key `nutritracker_v2`.
- It still recognizes `nutritracker_v1` and leaves that old key intact after migration.
- The Gemini key remains under `nutritracker_gemini_key`, as in the previous version.
- Changing the site's origin (for example, moving to a different domain) means browser storage will be separate. Before changing origins, use **Export backup** in the existing app, then **Import backup** in the new app. Imports merge by entry ID/date so existing entries are not silently replaced.
- Unknown legacy food entries are retained and marked **Needs review** rather than being discarded.

## File responsibilities

- `index.html`: document and app markup
- `css/styles.css`: styling and accessibility/motion preferences
- `js/data.js`: food database and nutrient profiles
- `js/state.js`: state, existing storage keys, migration, and favorites
- `js/calculations.js`: nutrient totals and status calculations
- `js/ui.js`: rendering, navigation, meals, and UI actions
- `js/food.js`: quick foods, history, and barcode lookup
- `js/ai.js`: image scanning, natural-language food parsing, meal suggestions, and AI review
- `js/insights.js`: period aggregations and insights rendering
- `js/sleep.js`: sleep logging and sleep summaries
- `js/dates.js`: day navigation
- `js/settings.js`: goal calculations
- `js/backup.js`: JSON export/import
- `js/main.js`: startup and service worker registration
- `sw.js`: versioned app-shell caching and best-effort caching of allowlisted CDNs

## Notes

This version keeps the existing browser-based design and external Tailwind, barcode, HEIC, and font dependencies. The local app files are included in the service-worker app shell. CDN-powered features and appearance may still require a successful online load before their assets are available offline.
