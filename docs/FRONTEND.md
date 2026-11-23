# Le front-end expliqué

Ce document explique comment le front est construit et pourquoi. Il sert à préparer la soutenance.

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
                    ├──► MongoDB : profils, publications
                    └──► Neo4j   : (:User {id})-[:FOLLOWS]->(:User {id})
```

Le front **ne parle jamais directement aux bases** : il ne connaît que l'API REST du back.

---

## 2. Les technologies et pourquoi

| Outil | Rôle | Pourquoi ce choix |
| --- | --- | --- |
| **React 19** | Construire l'interface en composants | Standard du marché, décidé par le groupe |
| **TypeScript** | JavaScript + types | Les types de `src/types.ts` reprennent le contrat d'API : si le back change un champ, la compilation signale les endroits à corriger |
| **Vite 8** | Serveur de développement et build | Démarrage instantané, proxy intégré vers le back |
| **Tailwind CSS 4** | Styles via des classes (`bg-white`, `p-4`…) | Pas de fichier CSS à maintenir, design cohérent |
| **React Router 8** | Plusieurs pages (URL) sans rechargement | `/`, `/people`, `/suggestions`, `/users/:id`, `/login` |
| **axios** | Requêtes HTTP | Gestion simple des erreurs et des en-têtes |

Volontairement **pas** de Redux, TanStack Query, etc. : chaque bibliothèque en plus est une chose de plus à justifier.

---

## 3. L'organisation des fichiers

```
src/
├── main.tsx                 Point d'entrée : monte React, le routeur et le contexte utilisateur
├── App.tsx                  Table des routes (quelle URL -> quelle page)
├── types.ts                 Types = miroir du contrat d'API (docs/API_CONTRACT.md)
│
├── api/                     Tout ce qui parle au back
│   ├── api.ts               L'interface Neo4LinkApi (la liste des appels possibles) + ApiError
│   ├── index.ts             Choisit l'API réelle ou simulée selon VITE_USE_MOCK
│   ├── realApi.ts           Implémentation réelle : requêtes HTTP avec axios
│   ├── traceStore.ts        Journal des requêtes pour le panneau « Coulisses »
│   └── mock/
│       ├── mockApi.ts       Implémentation simulée : fausses bases en mémoire
│       └── seed.ts          Données de démo (Karate Club de Zachary)
│
├── context/                 L'utilisateur connecté, partagé par toute l'application
│   ├── currentUser.ts       Définition du contexte + hooks useCurrentUser / useLoggedUser
│   └── CurrentUserProvider.tsx   Charge le profil et les abonnements, gère Suivre / Ne plus suivre
│
├── lib/
│   ├── useAsync.ts          Hook maison : charger des données + états loading / error
│   └── format.ts            Dates relatives, pluriels…
│
├── components/              Briques d'interface réutilisables
│   ├── Layout.tsx           Barre du haut + contenu + panneau Coulisses
│   ├── BackstagePanel.tsx   Le panneau « Coulisses »
│   ├── PostCard.tsx         Affiche un post selon son type (polymorphisme)
│   ├── PostComposer.tsx     Formulaire de publication (champs différents selon le type)
│   ├── FollowButton.tsx     Bouton Suivre / Abonné
│   ├── UserCard.tsx, Avatar.tsx, CreateUserForm.tsx, RequireUser.tsx
│   └── ui.tsx, icons.tsx    Petits composants (badges, boutons, icônes…)
│
└── pages/                   Une page = une URL
    ├── SelectProfilePage.tsx   /login        choisir ou créer un profil
    ├── FeedPage.tsx            /             fil d'actualité + publier
    ├── PeoplePage.tsx          /people       annuaire
    ├── SuggestionsPage.tsx     /suggestions  amis d'amis
    └── ProfilePage.tsx         /users/:id    profil, publications, abonnés, abonnements
```

---

## 4. Les idées importantes

### 4.1 Une interface, deux implémentations (API réelle / simulée)

`src/api/api.ts` décrit **ce que** le front peut demander (`getFeed`, `follow`, `createPost`…).
Deux fichiers disent **comment** :

- `realApi.ts` envoie de vraies requêtes HTTP au back FastAPI ;
- `mock/mockApi.ts` répond depuis la mémoire du navigateur.

Les pages importent seulement `api` depuis `src/api/index.ts`, qui choisit selon la variable
`VITE_USE_MOCK`. **Aucune page ne change** quand on passe du simulé au réel.

Intérêt : le front a pu être développé sans attendre le back, et la démo reste possible même si le back tombe.

### 4.2 L'API simulée respecte le cloisonnement des bases

Dans `mockApi.ts`, les données sont rangées comme dans la vraie architecture :

```ts
const mongo = { users, posts }          // documents complets
const neo4j = { nodes, follows }        // seulement des identifiants et des relations
```

Chaque méthode interroge ces deux « bases » dans le même ordre que le back, et note la requête
Cypher / MQL équivalente. Le panneau Coulisses affiche donc, en mode simulé, **les requêtes que le
back devra exécuter**. Les durées par requête ne sont pas affichées en mode simulé, car elles ne
seraient pas réelles.

### 4.3 L'orchestration : exemple du fil d'actualité

`GET /users/{id}/feed` combine les deux bases :

1. **Neo4j** : `MATCH (:User {id: $id})-[:FOLLOWS]->(f) RETURN collect(f.id)` : qui est-ce que je suis ?
2. **MongoDB** : `db.posts.find({author_id: {$in: ids}}).sort({created_at: -1}).limit(20)` : leurs posts.
3. **MongoDB** : `db.users.find({_id: {$in: authorIds}})` : les noms des auteurs (on appelle ça l'**hydratation**).

La clé de jointure entre les deux bases est **l'identifiant utilisateur**, identique dans les deux.

### 4.4 Le polymorphisme des posts, de MongoDB jusqu'à l'écran

MongoDB accepte dans la même collection des documents de formes différentes. Côté TypeScript,
on l'exprime avec une **union discriminée** (`src/types.ts`) :

```ts
type Post = TextPost | ImagePost | PollPost | ArticlePost   // le champ `type` dit lequel
```

Puis `PostCard.tsx` choisit l'affichage avec un `switch (post.type)`. Dans chaque `case`, TypeScript sait
quels champs existent (`post.options` n'existe que pour un sondage). Le bouton **« Document »** sous
chaque post montre le JSON stocké : on voit que les champs changent d'un type à l'autre.

### 4.5 Les suggestions « amis d'amis »

`GET /users/{id}/suggestions` fait un parcours à **2 sauts** dans Neo4j :

```cypher
MATCH (me:User {id: $id})-[:FOLLOWS]->(f:User)-[:FOLLOWS]->(s:User)
WHERE s <> me AND NOT (me)-[:FOLLOWS]->(s)
RETURN s.id, count(DISTINCT f) AS mutual_count
ORDER BY mutual_count DESC
```

Quand on clique « Suivre » sur une suggestion, le graphe change, la liste se recharge, la personne
disparaît et de nouvelles suggestions apparaissent (ses propres abonnements). C'est un bon moment de démo.

### 4.6 Comment une page charge ses données

Toutes les pages utilisent le hook `useAsync` :

```ts
const feed = useAsync(() => api.getFeed(user.id), [user.id, graphVersion])
// feed.loading, feed.data, feed.error, feed.reload()
```

Le tableau `[user.id, graphVersion]` dit quand recharger. `graphVersion` est un compteur du contexte
utilisateur, augmenté à chaque abonnement / désabonnement : toutes les pages qui dépendent du graphe
se mettent à jour d'elles-mêmes.

### 4.7 Pourquoi un proxy Vite ?

Le navigateur bloque par défaut les appels d'une origine (`localhost:5173`) vers une autre
(`localhost:8000`) : c'est la règle **CORS**. Le proxy de Vite fait passer les appels par la même
origine (`/api/...` → `localhost:8000/...`), donc pas besoin de configurer CORS côté back en développement.

---

## 5. Scénario de démo proposé (≈ 10 min)

Ouvrir le panneau **Coulisses** avant de commencer, et le commenter à chaque étape.

1. **Créer un profil** (page de choix du profil) → *Coulisses* : `insertOne` dans MongoDB **et** `MERGE (:User {id})` dans Neo4j : la double écriture.
2. **Annuaire** : suivre 2 ou 3 personnes → *Coulisses* : `MERGE (a)-[:FOLLOWS]->(b)`, uniquement Neo4j.
3. **Fil** : les posts des personnes suivies → *Coulisses* : Neo4j d'abord, puis deux requêtes MongoDB (orchestration + hydratation).
4. **Publier un sondage**, puis un article → *Coulisses* : deux documents de formes différentes dans la même collection. Bouton « Document » pour le montrer.
5. **Changer de profil** pour quelqu'un qui suit l'auteur → le post apparaît dans son fil.
6. **Suggestions** : expliquer le parcours à 2 sauts, suivre une suggestion, la liste se recompose.
7. **Profil** : les compteurs viennent de deux bases (pastilles MongoDB / Neo4j).

---

## 6. Questions probables du jury

**Pourquoi ne pas tout mettre dans MongoDB ?**
Les suggestions demandent de parcourir le graphe sur plusieurs niveaux. Dans MongoDB, cela passe par
`$graphLookup` ou des `$lookup` successifs, de plus en plus coûteux à chaque niveau. Neo4j est conçu pour ça.

**Pourquoi ne pas tout mettre dans Neo4j ?**
Les publications sont volumineuses et de formes variées, et Neo4j est optimisé pour garder le graphe
en mémoire. On y garde donc uniquement des identifiants et des relations.

**« O(1) par saut », vraiment ?**
Pas exactement. Neo4j utilise l'*index-free adjacency* : chaque nœud référence directement ses relations,
donc **suivre une relation** coûte O(1), sans recherche dans un index global. Un saut complet coûte donc
proportionnellement au **nombre de voisins** du nœud, et non à la taille totale de la base.

**Comment garder les deux bases cohérentes ?**
C'est le back qui orchestre : création d'un utilisateur = écriture MongoDB puis Neo4j. Pour aller plus
loin : transaction compensatoire si la 2ᵉ écriture échoue, ou Change Streams MongoDB pour synchroniser Neo4j.

**Le front accède-t-il directement aux bases ?**
Non, uniquement à l'API REST. Les identifiants des bases restent côté serveur.

**Comment le front marche-t-il sans le back ?**
Grâce à l'API simulée, qui implémente la même interface que l'API réelle. On bascule avec `VITE_USE_MOCK`.

---

## 7. Ce qui reste à faire (phase 2)

- Brancher le vrai back quand les routes du contrat seront prêtes (`VITE_USE_MOCK=false`).
- Vue graphe avec `react-force-graph-2d` (les deux communautés du Karate Club seront visibles).
- Page benchmark `$graphLookup` vs Cypher (nécessite une route côté back).
- Votes sur les sondages, « j'aime », suppression d'utilisateur (démo de la cascade).
