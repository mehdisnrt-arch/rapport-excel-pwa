# Rapport Excel PWA - Version complète

Application PWA pour GitHub Pages + Google Sheets / Apps Script.

## Ce que cette version ajoute

- Même structure Excel: TNT, FM, Climatisation, Energie.
- Chaque rapport crée une feuille Google Sheet formatée avec couleurs, bordures et tableaux.
- Photos avant/après séparées sous chaque partie:
  - TNT
  - FM
  - Climatisation
  - Energie
- Energie contient des champs remplissables:
  - Unité
  - Marque
  - Puissance
  - U. out
  - Fréquence (HZ)
  - U. Batterie
  - Compteur (h)
  - Temp. Huile
  - Pression Huile
  - Date
  - Remarques

## Installation Google Sheets

1. Ouvrir ton Google Sheet.
2. Extensions > Apps Script.
3. Supprimer l'ancien code.
4. Coller le contenu de `apps-script/Code.gs`.
5. Enregistrer.
6. Deploy > Manage deployments > Edit.
7. Version: New version.
8. Execute as: Me.
9. Who has access: Anyone.
10. Deploy.
11. Tester avec: `TON_LIEN_EXEC?action=setup`.

## Installation GitHub Pages

1. Dézipper le projet.
2. Uploader les fichiers dans la racine du repository GitHub:
   - `index.html`
   - `app.js`
   - `style.css`
   - `manifest.json`
   - `service-worker.js`
   - `icons/`
3. Settings > Pages.
4. Source: Deploy from branch.
5. Branch: main / root.
6. Ouvrir le lien GitHub Pages dans iPhone.
7. Share > Add to Home Screen.

## Important

Après remplacement des fichiers sur GitHub, ouvrir le lien avec `?v=3` à la fin pour casser le cache.
Exemple: `https://username.github.io/repo/?v=3`.
