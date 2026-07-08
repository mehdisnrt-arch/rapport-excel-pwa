You are editing a GitHub Pages PWA maintenance report app connected to Google Sheets via Apps Script.

Keep the current structure:
- index.html
- app.js
- style.css
- manifest.json
- service-worker.js
- apps-script/Code.gs

Do not remove existing features:
- PWA installable on iPhone
- Google Sheets sync
- report preview
- print/PDF
- export Excel .xls
- local backup JSON

Current required structure:
1/ Emetteurs TNT
2/ Emetteurs FM
3/ Climatisation
4/ Energie

Keep Excel-like colors and formatting in both the printable report and Google Sheet output.

Photos must be section-specific:
- TNT: avant/après
- FM: avant/après
- Climatisation: avant/après
- Energie: avant/après

Energie fields must remain editable:
- Unite
- Marque
- Puissance
- U. out
- Frequence (HZ)
- U. Batterie
- Compteur (h)
- Temp. Huile
- Pression Huile
- Date
- Remarques

When saving to Google Sheets, Apps Script must create one formatted sheet per report with all sections and their photos immediately below each section.
