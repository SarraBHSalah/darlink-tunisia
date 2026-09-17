# DarLink Tunisia — site complet (frontend + backend)

Site vitrine et gestion locative pour DarLink Tunisia, avec un vrai backend :
base de données, API, et panneau d'administration pour gérer les biens et les
messages reçus — sans jamais toucher au code.

## Ce que contient ce projet

- **Frontend public** (`public/*.html`, `public/css`, `public/js`) : le site vitrine, bilingue FR/EN, biens chargés dynamiquement depuis l'API.
- **Backend** (`server.js`, `routes/`, `db/`, `middleware/`, `lib/`) : serveur Node.js/Express, base de données JSON locale (`data/darlink.json`), API REST.
- **Panneau admin** (`public/admin/`) : `/admin/login.html` puis `/admin/dashboard.html` — ajouter, modifier, supprimer des biens ; consulter les messages de contact.

## Démarrage en local

Prérequis : [Node.js](https://nodejs.org) version 18 ou plus (vérifier avec `node -v`).

```bash
cd darlink-fullstack
npm install
cp .env.example .env
```

Ouvrez `.env` et changez au minimum `ADMIN_PASSWORD` et `SESSION_SECRET`.

```bash
npm run seed     # crée la base de données avec les 2 biens de départ + le compte admin
npm start        # démarre le serveur
```

Le site est accessible sur **http://localhost:8091**
Le panneau admin est sur **http://localhost:8091/admin/login.html**
(identifiants : ceux définis dans `.env`, par défaut `admin` / le mot de passe que vous avez choisi)

## Gérer les biens sans toucher au code

Connectez-vous sur `/admin/login.html`, onglet **Biens** :
- **+ Ajouter un bien** : remplissez le formulaire (type, ville, prix...). Pour les photos, cliquez sur **"+ Choisir des photos"** (ou glissez-déposez-les directement) pour les téléverser depuis votre ordinateur — JPG, PNG, WEBP ou GIF, 5 Mo max par photo. Un aperçu s'affiche, avec un bouton pour retirer une photo si besoin.
- **Modifier** / **Supprimer** sur chaque ligne.

Les changements apparaissent immédiatement sur le site public, aucune remise en ligne nécessaire.

Onglet **Messages** : tous les messages envoyés depuis le formulaire de contact du site apparaissent ici, avec leur statut (Nouveau / Lu / Archivé).

## Recevoir les messages par email

Par défaut, les messages du formulaire de contact sont uniquement enregistrés
dans la base de données (visibles dans `/admin`). Pour recevoir aussi un vrai
email à chaque nouveau message, renseignez les champs `SMTP_*` dans `.env`
(par exemple avec un compte Gmail + un "mot de passe d'application", ou un
service comme Brevo/SendGrid). Redémarrez le serveur après modification.

## Déployer en ligne (pour un lien accessible à tous)

Ce projet a besoin d'un serveur Node.js — impossible avec Netlify Drop (qui
ne sert que des fichiers statiques). Options gratuites et simples :

**Render.com (recommandé)**
1. Créez un compte sur render.com
2. "New +" → "Web Service" → connectez votre dépôt GitHub (ou uploadez le dossier via leur interface)
3. Build command : `npm install && npm run seed`
4. Start command : `npm start`
5. Ajoutez les variables d'environnement de votre `.env` dans l'onglet "Environment"
6. Déployez — vous obtenez un lien du type `https://darlink-tunisia.onrender.com`

**Railway.app** fonctionne de façon très similaire.

Important : sur ces plateformes gratuites, le disque peut être réinitialisé
entre les redéploiements. Pour un usage professionnel durable, prévoyez soit
un plan payant avec disque persistant, soit migrer `data/darlink.json` vers
une vraie base de données hébergée (PostgreSQL sur Render/Railway, tous deux
proposent un plan gratuit) — je peux faire cette migration si besoin.

## Sécurité — à faire avant un vrai lancement public

- Changez `ADMIN_PASSWORD` et `SESSION_SECRET` dans `.env` (ne gardez jamais les valeurs par défaut)
- Servez le site en HTTPS (automatique sur Render/Railway)
- Une fois en ligne, changez le mot de passe admin depuis l'onglet **Paramètres** du panneau admin
- Le fichier `data/darlink.json` contient les mots de passe hashés et les messages des clients : ne le partagez jamais publiquement

## Structure des fichiers

```
darlink-fullstack/
├── server.js              # point d'entrée du serveur
├── package.json
├── .env.example            # variables d'environnement à copier en .env
├── db/
│   ├── db.js               # connexion à la base de données JSON
│   └── seed.js             # création des données de départ
├── routes/
│   ├── properties.js       # API publique des biens
│   ├── contact.js          # API du formulaire de contact
│   └── admin.js            # API admin (auth + CRUD)
├── middleware/
│   └── auth.js             # protection des routes admin
├── lib/
│   └── mailer.js           # notifications email optionnelles
├── data/
│   └── darlink.json        # la base de données (créée par le seed)
└── public/                 # tout ce qui est servi au navigateur
    ├── index.html, biens.html, bien.html, services.html, apropos.html, contact.html
    ├── css/
    ├── js/
    └── admin/               # panneau d'administration
        ├── login.html
        ├── dashboard.html
        └── admin.js
```
