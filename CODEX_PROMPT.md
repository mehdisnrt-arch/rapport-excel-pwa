Tu es Codex. Travaille sur cette PWA de rapport maintenance.

Objectif métier:
- L'utilisateur veut une application installable sur iPhone via GitHub Pages.
- Les données sont sauvegardées dans Google Sheets via Apps Script.
- Plusieurs téléphones peuvent saisir les rapports.
- Le rapport doit garder exactement la structure Excel suivante:
  1/ Emetteurs TNT: tableau Service + Avant Intervention FWD/REF/T°/Alarm/Type + Après Intervention FWD/REF/T°/Alarm/Type + Date + Remarques.
  2/ Emetteurs FM: même tableau.
  3/ Climatisation: Service + ON + T. Cons. + T. Salle + Alarm + Type + Date + Remarques.
  4/ Energie: Service + Interventions sur site.
- Les photos avant/après doivent être ajoutées seulement à la fin du rapport.

Contraintes techniques:
- Rester compatible GitHub Pages: pas de Node, pas de backend autre que Apps Script.
- Garder les fichiers: index.html, style.css, app.js, manifest.json, service-worker.js, icons/.
- Backend dans apps-script/Code.gs.
- Ne pas ajouter de dépendances npm.
- Garder compatibilité iPhone Safari.
- Les photos doivent être compressées côté client.
- Utiliser JSONP pour lecture Apps Script et POST no-cors simple pour écriture.
- Garder le lien Apps Script actuel par défaut:
  https://script.google.com/macros/s/AKfycbxI66qHAU91KW4YP0KjQqkiMFX8WbzQ3cRqXmASemOpcSV2HVi6OeeZoKA4qJFKSyI0sg/exec

À tester:
1. Création rapport depuis iPhone.
2. Upload photo avant/après vers Drive.
3. Sync historique Google Sheets.
4. Rapport imprimable avec tables exactes.
5. Export Excel .xls.
6. Installation PWA sur iPhone.

Ne transforme pas la logique en fiche séparée par radio: il faut un seul rapport complet avec sections TNT, FM, Climatisation, Energie.
