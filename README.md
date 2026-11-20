# LoL Fearless & Draft Architect — Kit Git + Vercel + Antigravity (Saison 2026)

Application web modulaire de planification de draft, d'arborescences conditionnelles (*What-If Ban/Pick*), de gestion des Champion Pools (Tier S/A/B + Flex) et de simulation **Fearless Draft jusqu'en BO5** pour *League of Legends* (173 champions, Patch 26.22).

## Déploiement Express (Git + Vercel + Antigravity)

### 1. Initialiser le dépôt Git
Placez le contenu de ce dossier à la racine de votre dépôt Git :
```bash
git init
git add .
git commit -m "feat: initial modular LoL Fearless Draft Architect"
git branch -M main
git remote add origin https://github.com/<votre-compte>/<votre-repo>.git
git push -u origin main
```

### 2. Connecter à Vercel (Zéro Configuration)
1. Ouvrez [Vercel](https://vercel.com/new) et importez votre dépôt Git.
2. Laissez **Framework Preset** sur `Other` et **Output Directory** vide (`vercel.json` gère déjà les en-têtes et URLs propres).
3. Cliquez sur **Deploy** : votre site est en ligne en quelques secondes et se redéploie automatiquement à chaque `git push` depuis **Antigravity**.

### 3. Tester en local
```bash
npm run dev
```
Ouvrez deux onglets sur `http://localhost:5173/?room=DEMO` : le pilote `BroadcastChannel` intégré dans `src/services/collabSync.js` synchronise déjà vos drafts en temps réel entre les onglets !

## Architecture du Projet

```text
lol-draft-architect/
├── index.html                    # Squelette HTML (vues, modales, volets, nav mobile)
├── vercel.json                   # Configuration de déploiement statique Vercel
├── package.json                  # Scripts dev / preview / lcu-bridge
├── .gitignore                    # Exclusions Git standard
├── .env.example                  # Modèle de variables d'environnement (Supabase / LCU)
├── styles/
│   └── main.css                  # Thème Hextech, portraits, volets & responsive
├── bridge/
│   └── lcu-companion.mjs         # Compagnon local Node.js pour lire le lockfile LoL (LCU)
└── src/
    ├── data/
    │   ├── champions2026.js      # 173 champions + typologie Riot (7 classes / 13 sous-classes)
    │   └── presets.js            # Séquence tournoi 20 étapes + arbres Blue/Red par défaut
    ├── state/
    │   └── store.js              # État global (STATE), persistance localStorage & hook collab
    ├── engine/
    │   ├── visuals.js            # Portraits Data Dragon, fallback SVG & Radar 5 axes SVG
    │   ├── fearless.js           # Verrous Fearless BO5 (Hard / Soft / Standard)
    │   ├── draftActions.js       # Mutations de draft, Undo, IA Pools Joueurs & complétion
    │   ├── analytics.js          # Mix AD/AP/Brut & résolveur d'arborescence What-If
    │   └── roster.js             # Pools S/A/B, détection Flex, import CSV/JSON & synchro Arbre
    ├── services/
    │   ├── config.js             # Configuration des services (Collab & LCU)
    │   ├── collabSync.js         # Synchro temps réel (BroadcastChannel + hook Supabase)
    │   └── lcuBridge.js          # Client WebSocket vers le compagnon LCU local
    └── ui/
        ├── core.js               # Navigation, barre BO5 & perspective Blue/Red
        ├── draftView.js          # Plateau Blue/Red, conseiller IA & grille 173 champions
        ├── treeView.js           # Éditeur d'arborescence & stress-test What-If Ban
        ├── bo5View.js            # Matrice 5 manches, Pinch Analysis & Cimetière Fearless
        ├── encyclopediaView.js   # Table des 173 champions & éditeur de tags Riot
        ├── modals.js             # Modales What-If & Import/Export JSON / HTML
        ├── drawers.js            # Volets internes & volets latéraux coulissants
        └── app.js                # Notifications Toast & initialisation DOMContentLoaded
```

## Prochaines Étapes dans Antigravity
- **Collaboratif Internet** : Brancher le client `@supabase/supabase-js` dans `src/services/collabSync.js` avec vos variables `PUBLIC_SUPABASE_URL` et `PUBLIC_SUPABASE_ANON_KEY`.
- **Client LoL Live (LCU)** : Ajouter `ws` au compagnon `bridge/lcu-companion.mjs` pour relayer `OnJsonApiEvent_lol-champ-select_v1_session` vers `src/services/lcuBridge.js`.
