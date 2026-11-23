# Contrat d'API — Neo4Link

> **Statut : proposition du front, à valider avec l'équipe back.**
> Ce document fixe ce que le front envoie et ce qu'il attend en retour.
> Tant que le back n'est pas prêt, le front tourne avec une **API simulée** qui respecte
> exactement ce contrat (`src/api/mock/`). Le jour où le back respecte lui aussi ce contrat,
> on bascule en changeant une seule variable (`VITE_USE_MOCK=false`).
>
> Les types TypeScript correspondants sont dans [`src/types.ts`](../src/types.ts).

---

## 1. Conventions générales

| Sujet | Convention |
| --- | --- |
| Base URL | `http://localhost:8000` (le front passe par le proxy Vite : il appelle `/api/...`, Vite retransmet vers `:8000/...`) |
| Format | JSON, champs en `snake_case` (convention Python / Pydantic) |
| Identifiants | Chaîne opaque générée par le back (UUID v4 conseillé). C'est **le même identifiant** dans MongoDB (`_id`) et dans Neo4j (`(:User {id})`) — c'est la clé de jointure entre les deux bases |
| Dates | Chaîne ISO 8601 en UTC, ex. `"2026-11-23T14:05:18Z"` |
| Erreurs | Format FastAPI par défaut : `{"detail": "message"}` avec le bon code HTTP (`404` utilisateur inconnu, `409` doublon, `422` validation) |
| Champ `_id` Mongo | Le back renvoie `id` (string), jamais `_id` / `ObjectId` brut |

### Rappel du cloisonnement des données (décision du groupe)

- **Neo4j** : nœuds `(:User {id})` **sans aucune autre propriété** + relations `(:User)-[:FOLLOWS {since}]->(:User)`.
- **MongoDB** : collection `users` (identité complète) et collection `posts` (documents polymorphes).

---

## 2. Objets échangés

### `UserSummary` — version courte d'un utilisateur (listes, auteur d'un post)

```json
{
  "id": "u01",
  "username": "hiro",
  "display_name": "Hiro Tanaka",
  "avatar_url": null,
  "job_title": "Directeur R&D",
  "department": "R&D"
}
```

`avatar_url` peut être `null` : le front affiche alors les initiales.

### `User` — profil complet (collection MongoDB `users`)

`UserSummary` + :

```json
{
  "bio": "Passionné de karaté et de graphes.",
  "skills": ["Python", "Neo4j"],
  "created_at": "2026-11-01T09:00:00Z"
}
```

### `UserProfile` — réponse de `GET /users/{id}` (MongoDB **+** Neo4j)

`User` + un objet `stats` dont les compteurs viennent de **deux bases différentes** :

```jsonc
{
  "stats": {
    "followers_count": 16,   // Neo4j
    "following_count": 9,    // Neo4j
    "posts_count": 4         // MongoDB
  }
}
```

### `Post` — collection MongoDB `posts` (document polymorphe)

Champs communs à tous les posts :

```json
{
  "id": "p001",
  "author_id": "u01",
  "type": "text",
  "tags": ["neo4j", "graphes"],
  "likes_count": 12,
  "created_at": "2026-11-20T08:30:00Z"
}
```

Puis des champs **qui dépendent de `type`** (c'est là que la flexibilité de schéma de MongoDB sert) :

| `type` | Champs spécifiques | Exemple |
| --- | --- | --- |
| `text` | `text` | `{"text": "Bonjour !"}` |
| `image` | `caption?`, `image: {url, alt?, width?, height?, exif?}` | `{"image": {"url": "/demo/sunset.svg", "exif": {"Appareil": "Fujifilm X-T5", "ISO": "200"}}}` |
| `poll` | `question`, `options: [{label, votes}]`, `closes_at?` | `{"question": "Pizza ou sushi ?", "options": [{"label": "Pizza", "votes": 4}]}` |
| `article` | `title`, `body`, `reading_time_min` | `{"title": "Pourquoi un graphe ?", "body": "...", "reading_time_min": 4}` |

Le back peut valider ça avec une *union discriminée* Pydantic (`Field(discriminator="type")`).

### `FeedItem` — un élément du fil d'actualité

Un `Post` **hydraté** avec son auteur (les IDs viennent de Neo4j, le reste de MongoDB) :

```json
{
  "id": "p001",
  "author_id": "u01",
  "type": "text",
  "text": "Bonjour !",
  "tags": [],
  "likes_count": 3,
  "created_at": "2026-11-20T08:30:00Z",
  "author": { "id": "u01", "username": "hiro", "display_name": "Hiro Tanaka", "avatar_url": null, "job_title": "Directeur R&D", "department": "R&D" }
}
```

### `Suggestion` — une personne que l'utilisateur pourrait suivre

```json
{
  "user": { "...": "UserSummary" },
  "mutual_count": 3,
  "via": [ { "...": "UserSummary" } ]
}
```

- `mutual_count` : nombre de personnes que **je** suis et qui suivent cette personne.
- `via` : jusqu'à 3 de ces intermédiaires (pour afficher « Suivi par Alice, Bob et 1 autre »).

---

## 3. Routes

Légende de la colonne « Bases » : 🟢 MongoDB · 🔵 Neo4j.

| Méthode | Route | Bases | Corps envoyé | Réponse |
| --- | --- | --- | --- | --- |
| `GET` | `/users` | 🟢 | — | `UserSummary[]` |
| `POST` | `/users` | 🟢 🔵 | `UserCreate` | `201` `User` |
| `GET` | `/users/{id}` | 🟢 🔵 | — | `UserProfile` |
| `GET` | `/users/{id}/posts` | 🟢 | — | `Post[]` (plus récent d'abord) |
| `GET` | `/users/{id}/following` | 🔵 🟢 | — | `UserSummary[]` |
| `GET` | `/users/{id}/followers` | 🔵 🟢 | — | `UserSummary[]` |
| `POST` | `/users/{id}/follow` | 🔵 | `{"target_id": "u02"}` | `204` |
| `DELETE` | `/users/{id}/follow/{target_id}` | 🔵 | — | `204` |
| `GET` | `/users/{id}/feed?limit=20` | 🔵 🟢 | — | `FeedItem[]` (plus récent d'abord) |
| `GET` | `/users/{id}/suggestions?limit=10` | 🔵 🟢 | — | `Suggestion[]` (meilleur score d'abord) |
| `POST` | `/posts` | 🟢 | `PostCreate` | `201` `Post` |

### `UserCreate`

```json
{
  "username": "jdupont",
  "display_name": "Jeanne Dupont",
  "job_title": "Data engineer",
  "department": "R&D",
  "bio": "",
  "skills": ["MongoDB"]
}
```

`409` si `username` existe déjà.

### `PostCreate`

Les champs communs `author_id` + `type` + `tags`, puis les champs spécifiques au type
(mêmes que dans `Post`, sans `id`, `likes_count`, `created_at` et `reading_time_min` que le back calcule) :

```json
{ "author_id": "u01", "type": "poll", "tags": ["team"], "question": "Pizza ou sushi ?", "options": [{"label": "Pizza"}, {"label": "Sushi"}] }
```

Pour un sondage, le front envoie `options: [{label}]` ; le back initialise `votes` à `0`.

---

## 4. Ce que chaque route fait dans les bases (requêtes attendues)

C'est aussi ce que l'API simulée affiche dans le panneau « Coulisses » du front.

### `POST /users` — écriture dans les deux bases

```js
// 🟢 MongoDB
db.users.insertOne({ _id: "<uuid>", username, display_name, job_title, department, bio, skills, avatar_url: null, created_at: new Date() })
```
```cypher
// 🔵 Neo4j — seulement l'identifiant
MERGE (:User {id: $id})
```

### `POST /users/{id}/follow` — Neo4j uniquement

```cypher
MATCH (a:User {id: $id}), (b:User {id: $target_id})
MERGE (a)-[r:FOLLOWS]->(b)
ON CREATE SET r.since = datetime()
```

### `GET /users/{id}/feed` — orchestration Neo4j → MongoDB

```cypher
// 1. 🔵 Qui est-ce que je suis ?
MATCH (:User {id: $id})-[:FOLLOWS]->(f:User)
RETURN collect(f.id) AS ids
```
```js
// 2. 🟢 Leurs posts les plus récents
db.posts.find({ author_id: { $in: ids } }).sort({ created_at: -1 }).limit(20)
// 3. 🟢 Hydratation des auteurs
db.users.find({ _id: { $in: authorIds } }, { username: 1, display_name: 1, avatar_url: 1, job_title: 1, department: 1 })
```

### `GET /users/{id}/suggestions` — les « amis d'amis »

```cypher
// 🔵 Personnes suivies par les gens que je suis, que je ne suis pas encore
MATCH (me:User {id: $id})-[:FOLLOWS]->(f:User)-[:FOLLOWS]->(s:User)
WHERE s <> me AND NOT (me)-[:FOLLOWS]->(s)
RETURN s.id AS id, count(DISTINCT f) AS mutual_count, collect(DISTINCT f.id)[..3] AS via
ORDER BY mutual_count DESC
LIMIT $limit
```
```js
// 🟢 Hydratation des profils suggérés et des intermédiaires
db.users.find({ _id: { $in: [...ids, ...viaIds] } })
```

### `GET /users/{id}` — profil

```js
db.users.findOne({ _id: id })               // 🟢
db.posts.countDocuments({ author_id: id })  // 🟢
```
```cypher
// 🔵
MATCH (u:User {id: $id})
RETURN COUNT { (u)<-[:FOLLOWS]-() } AS followers_count,
       COUNT { (u)-[:FOLLOWS]->() } AS following_count
```

---

## 5. Optionnel : en-tête `X-Db-Trace` (pour le panneau « Coulisses »)

**Le front fonctionne sans.** S'il est présent, le front affiche le détail de ce que le back a exécuté.

Le back peut ajouter à chaque réponse un en-tête HTTP `X-Db-Trace` contenant un tableau JSON
(encodé en ASCII, `json.dumps(..., ensure_ascii=True)`) :

```json
[
  { "db": "neo4j",   "operation": "Abonnements",       "query": "MATCH (:User {id: $id})-[:FOLLOWS]->(f) RETURN collect(f.id)", "duration_ms": 3.2 },
  { "db": "mongodb", "operation": "Posts des abonnés", "query": "db.posts.find({author_id: {$in: [...]}})",                     "duration_ms": 5.8 }
]
```

Mise en œuvre côté FastAPI (indication) : chaque repository ajoute une entrée dans une
`contextvars.ContextVar` ; un middleware la sérialise dans l'en-tête de la réponse.
Si le front est servi depuis une autre origine que l'API, il faut aussi
`expose_headers=["X-Db-Trace"]` dans le `CORSMiddleware`.

---

## 6. Phase 2 (à discuter plus tard)

| Route | Usage côté front |
| --- | --- |
| `GET /graph` → `{nodes: [{id, ...}], links: [{source, target}]}` | Vue graphe (`react-force-graph-2d`) |
| `GET /users/{a}/path/{b}` | Plus court chemin entre deux personnes |
| `DELETE /users/{id}` | Démo de la suppression en cascade dans les deux bases |
| `GET /benchmark/friends-of-friends/{id}` | Comparaison `$graphLookup` (MongoDB) vs Cypher (Neo4j) |
| `POST /posts/{id}/like`, `POST /posts/{id}/vote` | Interactions sur les posts |

---

## 7. Points encore ouverts

- Les deux documents du groupe ne nomment pas pareil la route du fil (`/feed/{user_id}` vs `/users/{id}/feed`) ni la propriété Neo4j (`user_id` vs `id`). Ce contrat retient `/users/{id}/feed` et `id`.
- `FOLLOWS` est **dirigé** (modèle « abonnement », comme Twitter) : suivre quelqu'un n'implique pas qu'il vous suive.
