# Neo4Link — Front-end

Interface web du prototype de réseau social d'entreprise **Neo4Link**, qui combine deux bases NoSQL :

- **MongoDB** (documents) : comptes, profils, publications avec leurs likes et commentaires
- **Neo4j** (graphe) : abonnements `(:User)-[:FOLLOWS]->(:User)`, fil d'actualité, suggestions « amis d'amis »

Back-end : [Neo4Link-BackEnd](https://github.com/LeoSaunier/Neo4Link-BackEnd) (FastAPI). Le front suit
ses formats de données (voir [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md)).

## Démarrage rapide

Prérequis : [Node.js](https://nodejs.org/) 20.19+ ou 22.12+ (exigence de Vite 8).

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173.

Par défaut, le front utilise une **API simulée** (aucun back nécessaire) : 34 comptes de démo (le
réseau du « Karate Club de Zachary ») et une trentaine de publications. Sur la page de connexion,
un clic sur un compte de démo connecte directement avec le mot de passe de démo (`VITE_DEMO_PASSWORD`
dans [`.env.example`](.env.example)).

## Brancher le vrai back

1. Démarrer le back FastAPI sur le port 8000.
2. Créer un fichier `.env.local` à la racine du front :

   ```bash
   VITE_USE_MOCK=false
   VITE_API_TARGET=http://localhost:8000
   ```

3. Relancer `npm run dev`.

Le front appelle `/api/...` ; le serveur de développement Vite retransmet vers `VITE_API_TARGET`
(voir `vite.config.ts`).

Pour que la connexion rapide marche avec le vrai back, son script `seed.py` doit hacher le même mot
de passe de démo que `VITE_DEMO_PASSWORD` pour les comptes de démo.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement avec rechargement à chaud |
| `npm run build` | Vérification TypeScript + build de production dans `dist/` |
| `npm run preview` | Sert le build de production |
| `npm run lint` | Analyse statique du code (Oxlint) |

## Documentation

- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) : routes et formats du back, avec le statut de chaque route
- [`docs/FRONTEND.md`](docs/FRONTEND.md) : architecture du front, expliquée fichier par fichier, et scénario de démo
