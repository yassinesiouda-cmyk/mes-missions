# Ganba! : app de tâches pour enfant (PWA)

*Ganba* vient du japonais *ganbaru* : « faire de son mieux, persévérer ».

Web app installable (PWA), en HTML/CSS/JS vanilla, sans dépendance, sans
compte et sans serveur. Toutes les données restent dans le navigateur du
téléphone (`localStorage`).

## Ce que fait l'app (v2)

- **Ma journée** : un compagnon kawaii (au choix : Mochi, Pyon, Kuma, Kitsu)
  dont l'humeur suit la journée, la liste des missions à cocher et une barre de
  progression. Une tâche à points reste « en attente » jusqu'à la validation
  du parent. Une tâche « en famille » (sans points) se coche, sans validation.
- **Boutique** : l'enfant demande une récompense. Les points sont réservés
  jusqu'à ce que le parent accepte (points débités) ou refuse (points rendus).
- **Ses idées** : l'enfant peut proposer une mission ou une récompense. Le
  parent l'ajoute (en fixant les points) ou la refuse.
- **Petit mot** : en validant, le parent peut laisser un mot qui félicite
  l'effort ; il s'affiche dans la bulle du compagnon.
- **Thèmes** : Sakura, Lavande, Menthe, Nuit, au choix de l'enfant.
- **Parent 🔒** (code à 4 chiffres créé au premier accès) : valider ou refuser
  les tâches, les demandes et les idées ; gérer les tâches et les récompenses ;
  corriger le solde ; changer le code. L'espace se reverrouille quand on change
  d'onglet ou que l'app passe en arrière-plan.

### Choix éducatifs

- Les récompenses matérielles attendues peuvent faire baisser la motivation
  propre de l'enfant, alors que les retours verbaux positifs l'augmentent
  (Deci, Koestner & Ryan, 1999). D'où le petit mot centré sur l'effort, les
  tâches de famille sans points et des récompenses par défaut tournées vers des
  moments partagés.
- Proposer ses propres missions et récompenses soutient l'autonomie.
- Les mini-jeux sont reportés : peu de preuves qu'ils aident au-delà du jeu
  lui-même, et ils ajouteraient du temps d'écran.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | page unique |
| `styles.css` | apparence |
| `app.js` | logique et stockage |
| `mascot.js` | compagnons dessinés en SVG |
| `manifest.webmanifest` | nom, icônes, mode plein écran (installation) |
| `sw.js` | service worker : ouverture rapide et fonctionnement hors ligne |
| `icons/` | icônes 192 et 512 px |

## Lancer en local (sur un ordinateur)

```bash
cd mes-missions
python3 -m http.server 8000
```

Ouvrir ensuite http://localhost:8000. Dans Chrome, le mode « appareil
mobile » des outils de développement (F12) simule un téléphone.

## Installer sur le téléphone Android

Une PWA ne s'installe qu'en **HTTPS**. Le plus simple et gratuit est GitHub Pages.

1. Créer un **nouveau dépôt public** sur GitHub, qui ne contient que cette app
   (par exemple `mes-missions`).
2. Y copier le contenu de ce dossier **à la racine** (`index.html` à la racine).
3. Dans le dépôt, aller dans **Settings → Pages**, puis **Source : Deploy from a
   branch**, branche `main`, dossier `/ (root)`, et enregistrer.
4. Après une à deux minutes, l'adresse s'affiche, de la forme
   `https://<compte>.github.io/mes-missions/`.
5. Sur le téléphone de l'enfant, ouvrir cette adresse dans **Chrome**, puis
   ouvrir le menu **⋮** et choisir **Ajouter à l'écran d'accueil** (ou
   **Installer l'application**).
6. Ouvrir l'app depuis l'icône, aller dans **Parent** et créer le code tout de
   suite, avant de lui donner le téléphone.

Le code est public, mais les données de l'enfant ne le sont pas : elles ne
quittent jamais le téléphone.

### Mettre à jour l'app

Modifier les fichiers dans le dépôt de publication, puis changer `VERSION` dans
`sw.js` (par exemple `missions-v2`). Le téléphone récupère la nouvelle version
à la prochaine ouverture avec du réseau.

## Limites connues

- **Les données sont stockées dans Chrome.** Si l'on vide les données de Chrome
  ou du site, ou si l'on désinstalle l'app, tout est perdu (points, tâches,
  code). Il n'y a pas de sauvegarde en v1.
- **Le code parent protège contre les clics, pas contre une experte.** Une
  enfant motivée peut effacer les données du site, ce qui remet tout à zéro, y
  compris ses points. Il n'y a donc pas d'intérêt à tricher.
- **Code oublié** : la seule solution est d'effacer les données du site dans Chrome.
- Les tâches reviennent chaque jour, sans choix des jours de la semaine.
