# Le front-end expliqué

Ce document explique comment le front est construit et pourquoi. Il sert à préparer la soutenance.
Le front suit le fonctionnement du back (formats décrits dans [`API_CONTRACT.md`](API_CONTRACT.md)).

---

## 1. Le rôle du front dans le projet

Le sujet demande un prototype qui montre **comment chaque base est utilisée et comment elles interagissent**.
Le front a donc deux missions :

1. Être une application crédible (un mini réseau social d'entreprise).
2. **Rendre visible ce qui se passe dans les bases** : c'est le rôle du panneau « Coulisses »,
   des pastilles MongoDB / Neo4j et du bouton « Document » sur chaque post.

```
Navigateur (React, port 5173)
   │  appels HTTP /api/...       ← affichés dans le panneau « Coulisses »
   ▼
Proxy Vite  ──►  Back FastAPI (port 8000)
                    ├──► MongoDB : comptes, profils, compteurs, publications (likes et commentaires inclus)
                    └──► Neo4j   : (:User {id, username})-[:FOLLOWS]->(:User)
```

Le front **ne parle jamais directement aux bases** : il ne connaît que l'API REST du back.

---

## 2. Les technologies et pourquoi

| Outil | Rôle | Pourquoi ce choix |
| --- | --- | --- |
| **React 19** | Construire l'interface en composants | Standard du marché, décidé par le groupe |
| **TypeScript** | JavaScript + types | Les types de `src/types.ts` reprennent les documents du back : si le back change un champ, la compilation signale les endroits à corriger |
| **Vite 8** | Serveur de développement et build | Démarrage instantané, proxy intégré vers le back |
| **Tailwind CSS 4** | Styles via des classes (`bg-white`, `p-4`…) | Pas de fichier CSS à maintenir, design cohérent |
| **React Router 8** | Plusieurs pages (URL) sans rechargement | `/login`, `/register`, `/`, `/people`, `/suggestions`, `/users/:id` |
| **axios** | Requêtes HTTP | Gestion simple des erreurs et des en-têtes |

Volontairement **pas** de Redux, TanStack Query, etc. : chaque bibliothèque en plus est une chose de plus à justifier.

---

## 3. L'organisation des fichiers

```
src/
├── main.tsx                 Point d'entrée : monte React, le routeur et le contexte utilisateur
├── App.tsx                  Table des routes (quelle URL -> quelle page)
├── config.ts                Réglages : API simulée ou réelle, mot de passe des comptes de démo
├── types.ts                 Types = miroir des documents du back
│
├── api/                     Tout ce qui parle au back
│   ├── api.ts               L'interface Neo4LinkApi (la liste des appels possibles) + ApiError
│   ├── index.ts             Choisit l'API réelle ou simulée selon VITE_USE_MOCK
│   ├── realApi.ts           Implémentation réelle : requêtes HTTP avec axios (toutes les URL sont ici)
│   ├── traceStore.ts        Journal des requêtes pour le panneau « Coulisses »
│   └── mock/
│       ├── mockApi.ts       Implémentation simulée : fausses bases en mémoire
│       └── seed.ts          Données de démo (Karate Club de Zachary)
│
├── context/                 L'utilisateur connecté, partagé par toute l'application
│   ├── currentUser.ts       Définition du contexte + hooks useCurrentUser / useLoggedUser
│   └── CurrentUserProvider.tsx   Connexion, inscription, reprise de session, Suivre / Ne plus suivre
│
├── lib/
│   ├── useAsync.ts          Hook maison : charger des données + états loading / error
│   └── format.ts            Dates relatives, pluriels…
│
├── components/              Briques d'interface réutilisables
│   ├── Layout.tsx           Barre du haut + contenu + panneau Coulisses
│   ├── BackstagePanel.tsx   Le panneau « Coulisses »
│   ├── PostCard.tsx         Un post : texte, j'aime, commentaires, document MongoDB
│   ├── PostComposer.tsx     Formulaire de publication
│   ├── FollowButton.tsx     Bouton Suivre / Abonné
│   ├── UserCard.tsx, Avatar.tsx, RequireUser.tsx
│   └── ui.tsx, icons.tsx    Petits composants (badges, boutons, icônes…)
│
└── pages/                   Une page = une URL
    ├── LoginPage.tsx           /login        connexion + connexion rapide aux comptes de démo
    ├── RegisterPage.tsx        /register     inscription
    ├── FeedPage.tsx            /             fil d'actualité + publier
    ├── PeoplePage.tsx          /people       annuaire
    ├── SuggestionsPage.tsx     /suggestions  amis d'amis
    └── ProfilePage.tsx         /users/:id    profil, publications, abonnés, abonnements
```

---

## 4. Les idées importantes

### 4.1 Une interface, deux implémentations (API réelle / simulée)

`src/api/api.ts` décrit **ce que** le front peut demander (`login`, `getFeed`, `follow`, `likePost`…).
Deux fichiers disent **comment** :

- `realApi.ts` envoie de vraies requêtes HTTP au back FastAPI ;
- `mock/mockApi.ts` répond depuis la mémoire du navigateur.

Les pages importent seulement `api` depuis `src/api/index.ts`, qui choisit selon la variable
`VITE_USE_MOCK`. **Aucune page ne change** quand on passe du simulé au réel.

Intérêt : le front avance sans attendre le back, et la démo reste possible même si le back tombe.

### 4.2 L'API simulée imite le back

Dans `mockApi.ts`, les données sont rangées comme dans les vraies bases :

```ts
const mongo = { users, posts }          // documents complets (compteurs, likes et commentaires inclus)
const neo4j = { nodes, follows }        // nœuds (:User {id, username}) et relations FOLLOWS
```

Chaque méthode interroge ces deux « bases » dans le même ordre que le back, et note la requête
Cypher / MQL équivalente. Le panneau Coulisses affiche donc, en mode simulé, **les requêtes que le
back exécute**. Les durées par requête ne sont pas affichées en mode simulé, car elles ne seraient pas réelles.

### 4.3 Inscription : double écriture avec retour arrière

`POST /auth/register` :

1. **MongoDB** : le back hache le mot de passe (bcrypt) puis insère le document complet
   (`profile`, `stats` à zéro…).
2. **Neo4j** : il crée le nœud `(:User {id, username})`.
3. Si l'étape 2 échoue, il **supprime** le document de l'étape 1 et répond `503`.

C'est une façon simple de garder les deux bases cohérentes sans transaction distribuée
(on parle de « transaction compensatoire »).

Il n'y a pas de jeton : après la connexion, le front garde l'identifiant de l'utilisateur et l'envoie
dans les requêtes (`author_id`, `user_id`), comme le prévoient les schémas du back.

### 4.4 L'orchestration : exemple du fil d'actualité

`GET /users/{id}/feed` combine les deux bases :

1. **Neo4j** : `MATCH (:User {id: $id})-[:FOLLOWS]->(f) RETURN collect(f.id)` : qui est-ce que je suis ?
2. **MongoDB** : `db.posts.find({author_id: {$in: ids}}).sort({created_at: -1}).limit(20)` : leurs posts.

Il n'y a **pas de 3ᵉ requête** pour les noms des auteurs : chaque post contient une copie
`author_snapshot: {username, full_name}`. La clé de jointure entre les deux bases est
**l'identifiant utilisateur**, identique dans les deux.

### 4.5 Le document « post » : tout au même endroit

Un post MongoDB contient sa copie de l'auteur, ses likes (`likes: [ids]`) et ses commentaires
(`comments: [...]`). C'est le principe du modèle document : **on range ensemble ce qu'on lit ensemble**,
une seule lecture suffit pour afficher un post complet. Le bouton **« Document »** sous chaque post le montre.

Les actions modifient le document de façon **atomique**, sans le relire avant :

| Action | Requête MongoDB |
| --- | --- |
| J'aime | `findOneAndUpdate({_id}, {$addToSet: {likes: userId}})` : `$addToSet` empêche les doublons |
| Je n'aime plus | `findOneAndUpdate({_id}, {$pull: {likes: userId}})` |
| Commenter | `findOneAndUpdate({_id}, {$push: {comments: {...}}})` |

Le back renvoie le post mis à jour, que la carte affiche directement.

### 4.6 Les compteurs d'abonnés : une copie à tenir à jour

La vérité sur les abonnements est dans Neo4j (les relations `FOLLOWS`). Mais le back garde aussi
les compteurs dans MongoDB (`stats.followers_count`, `stats.following_count`) pour afficher un profil
avec une seule lecture. Chaque abonnement fait donc :

```cypher
MERGE (a)-[r:FOLLOWS]->(b) SET r.since = datetime()     // Neo4j
```
```js
db.users.updateOne({_id: a}, {$inc: {"stats.following_count": 1}})   // MongoDB
db.users.updateOne({_id: b}, {$inc: {"stats.followers_count": 1}})
```

Les compteurs ne sont incrémentés **que si la relation n'existait pas déjà** (sinon ils dériveraient).
Sur la page profil, les compteurs portent la pastille MongoDB, les listes d'abonnés viennent de Neo4j.

### 4.7 Les suggestions « amis d'amis »

`GET /users/{id}/suggestions` fait un parcours à **2 sauts** dans Neo4j :

```cypher
MATCH (me:User {id: $id})-[:FOLLOWS]->(f:User)-[:FOLLOWS]->(s:User)
WHERE s <> me AND NOT (me)-[:FOLLOWS]->(s)
RETURN s.id, count(DISTINCT f) AS mutual_count
ORDER BY mutual_count DESC
```

Quand on clique « Suivre » sur une suggestion, le graphe change, la liste se recharge, la personne
disparaît et de nouvelles suggestions apparaissent (ses propres abonnements). C'est un bon moment de démo.

### 4.8 Comment une page charge ses données

Toutes les pages utilisent le hook `useAsync` :

```ts
const feed = useAsync(() => api.getFeed(user._id), [user._id, graphVersion])
// feed.loading, feed.data, feed.error, feed.reload()
```

Le tableau `[user._id, graphVersion]` dit quand recharger. `graphVersion` est un compteur du contexte
utilisateur, augmenté à chaque abonnement / désabonnement : les pages qui dépendent du graphe
se mettent à jour d'elles-mêmes.

### 4.9 Pourquoi un proxy Vite ?

Le navigateur bloque par défaut les appels d'une origine (`localhost:5173`) vers une autre
(`localhost:8000`) : c'est la règle **CORS**. Le back autorise déjà le port 5173, mais le proxy de Vite
fait de toute façon passer les appels par la même origine (`/api/...` → `localhost:8000/...`).

---

## 5. Scénario de démo proposé (≈ 10 min)

Ouvrir le panneau **Coulisses** avant de commencer, et le commenter à chaque étape.

1. **Créer un compte** → *Coulisses* : `insertOne` dans MongoDB (mot de passe haché) **puis** `MERGE` dans Neo4j. Expliquer le retour arrière si Neo4j échoue.
2. **Annuaire** : suivre 2 ou 3 personnes → *Coulisses* : la relation Neo4j **et** les deux `$inc` MongoDB.
3. **Fil** : les posts des personnes suivies → *Coulisses* : Neo4j d'abord, puis une seule requête MongoDB grâce à `author_snapshot`.
4. **Liker et commenter** un post → *Coulisses* : `$addToSet` et `$push` sur le même document. Bouton « Document » pour le montrer.
5. **Publier**, puis **se reconnecter** (connexion rapide) avec quelqu'un qui suit l'auteur → le post apparaît dans son fil.
6. **Suggestions** : expliquer le parcours à 2 sauts, suivre une suggestion, la liste se recompose.
7. **Profil** : compteurs (copie MongoDB) et listes d'abonnés (Neo4j).

---

## 6. Questions probables du jury

**Pourquoi ne pas tout mettre dans MongoDB ?**
Les suggestions demandent de parcourir le graphe sur plusieurs niveaux. Dans MongoDB, cela passe par
`$graphLookup` ou des `$lookup` successifs, de plus en plus coûteux à chaque niveau. Neo4j est conçu pour ça.

**Pourquoi ne pas tout mettre dans Neo4j ?**
Les publications, avec leurs likes et commentaires, sont des documents volumineux qui grossissent
avec le temps. Neo4j est optimisé pour garder le graphe en mémoire : on y garde seulement des
identifiants, un nom d'utilisateur et des relations.

**Pourquoi copier le nom de l'auteur dans chaque post ?**
Pour afficher le fil avec une seule requête MongoDB. Contrepartie : si quelqu'un change de nom,
ses anciens posts gardent l'ancien (il faudrait un `updateMany` sur ses posts).

**Les compteurs d'abonnés existent dans deux bases : que se passe-t-il si une écriture échoue ?**
Neo4j fait foi. En cas de doute, on peut recalculer les compteurs à partir des relations
(`COUNT { (u)<-[:FOLLOWS]-() }`) et corriger MongoDB.

**« O(1) par saut », vraiment ?**
Pas exactement. Neo4j utilise l'*index-free adjacency* : chaque nœud référence directement ses relations,
donc **suivre une relation** coûte O(1), sans recherche dans un index global. Un saut complet coûte donc
proportionnellement au **nombre de voisins** du nœud, et non à la taille totale de la base.

**Le front accède-t-il directement aux bases ?**
Non, uniquement à l'API REST. Les identifiants des bases restent côté serveur.

**Comment le front marche-t-il sans le back ?**
Grâce à l'API simulée, qui implémente la même interface que l'API réelle. On bascule avec `VITE_USE_MOCK`.

---

## 7. Ce qui reste à faire

- Brancher le vrai back quand ses routes seront prêtes (`VITE_USE_MOCK=false`), et ajuster les URL de
  `realApi.ts` si le back en choisit d'autres (voir les routes ⚪ du contrat).
- Vue graphe avec `react-force-graph-2d` (les deux communautés du Karate Club seront visibles).
- Page benchmark `$graphLookup` vs Cypher (nécessite une route côté back).
