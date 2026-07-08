# Rapport Excel Maintenance — PWA GitHub + Google Sheets

Cette version respecte le format demandé: un rapport complet comme Excel, avec les sections:

1. Emetteurs TNT
2. Emetteurs FM
3. Climatisation
4. Energie
5. Photos avant / après à la fin

## Contenu

- `index.html`, `style.css`, `app.js`: interface PWA compatible GitHub Pages.
- `manifest.json`, `service-worker.js`, `icons/`: installation sur iPhone.
- `apps-script/Code.gs`: backend Google Sheets + Drive.
- `CODEX_PROMPT.md`: prompt prêt pour Codex.

## Apps Script URL déjà configuré

```text
https://script.google.com/macros/s/AKfycbxI66qHAU91KW4YP0KjQqkiMFX8WbzQ3cRqXmASemOpcSV2HVi6OeeZoKA4qJFKSyI0sg/exec
```

## Installation Google Sheets

1. Ouvre ton Google Sheet.
2. Va dans **Extensions > Apps Script**.
3. Remplace l'ancien code par le contenu de `apps-script/Code.gs`.
4. Enregistre.
5. Lance une fois la fonction `setup_` pour accepter les autorisations.
6. Va dans **Deploy > Manage deployments**.
7. Clique sur le crayon **Edit**.
8. Choisis **New version**.
9. Garde:
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
10. Clique **Deploy**.
11. Garde le lien `/exec`.

## Installation GitHub Pages

1. Dézippe ce dossier.
2. Upload tout le contenu dans la racine du repository GitHub:
   - `index.html`
   - `style.css`
   - `app.js`
   - `manifest.json`
   - `service-worker.js`
   - dossier `icons`
3. Va dans **Settings > Pages**.
4. Source: **Deploy from branch**.
5. Branch: `main`, Folder: `/root`.
6. Ouvre le lien GitHub Pages.
7. Sur iPhone: Safari > Share > Add to Home Screen.

## Utilisation

- Ouvre l'app.
- Remplis les valeurs dans les tableaux TNT, FM, Climatisation et Energie.
- Ajoute photo avant et photo après à la fin.
- Clique **Enregistrer dans Google Sheets**.
- Clique **Historique > Sync Google Sheets** pour vérifier.
- Clique **Rapport > Imprimer / PDF**.

## Important

- Les photos sont compressées côté téléphone avant envoi.
- Chaque rapport est enregistré comme une ligne dans Google Sheets avec JSON complet + liens Drive des photos.
- Le rapport imprimé garde la même structure que l'Excel fourni.
