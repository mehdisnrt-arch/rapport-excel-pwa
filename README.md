# Rapport Excel PWA - Version finale centres

Application PWA pour GitHub Pages + Google Sheets / Apps Script.

## Ce qui est inclus

- Rapport avec structure Excel: TNT, FM, Climatisation, Energie.
- Centre sélectionnable: FIGUIG, BOUARFA, TENDRARA, AINCHAIR, BOUANANE, AIN CHWATER, BENITADJIT, TALSINET.
- Photos avant/après par partie: TNT, FM, Climatisation, Energie.
- Champs Energie vides par défaut: Unité, Marque, Puissance, U. out, Fréquence, U. Batterie, Compteur, Temp. Huile, Pression Huile.
- Si une partie n’est pas remplie, elle ne sort pas dans le rapport.
- Suppression locale et suppression définitive Google Sheets depuis l’historique.
- Chaque rapport crée une feuille Google Sheet formatée avec couleurs et bordures.

## Mise à jour Apps Script

1. Ouvre ton Google Sheet.
2. Extensions > Apps Script.
3. Supprime l'ancien code.
4. Colle `apps-script/Code.gs`.
5. Save.
6. Deploy > Manage deployments > Edit.
7. Version: New version.
8. Deploy.

## Mise à jour GitHub Pages

1. Upload tous les fichiers à la racine du repo GitHub.
2. Garde GitHub Pages sur branch `main`, folder `/root`.
3. Ouvre le lien avec `?v=5` pour casser le cache.
4. Sur iPhone, supprime l'ancienne icône PWA puis ajoute-la de nouveau.
