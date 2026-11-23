# Contrat d'API — Neo4Link

> **Ce contrat suit le fonctionnement du back** (dépôt `Neo4Link-BackEnd`, commit `5b96b6a`).
> Les formats de données sont ceux du back : documents MongoDB renvoyés avec `_id`, profil imbriqué
> dans `profile`, posts texte avec copie de l'auteur (`author_snapshot`), likes et commentaires
> dans le post.
>
> Le back n'a pas encore écrit toutes ses routes. Chaque route porte donc un statut :
>
> | Statut | Signification |
> | --- | --- |
> | ✅ | La route existe dans le back |
> | 🟡 | Le schéma Pydantic existe dans le back, la route reste à écrire |
> | ⚪ | Proposition du front, à confirmer avec l'équipe back |
>
> Côté front, toutes les URL sont regroupées dans [`src/api/realApi.ts`](../src/api/realApi.ts) :
> si le back choisit une autre URL, il n'y a qu'une ligne à changer.
> Les types TypeScript correspondants sont dans [`src/types.ts`](../src/types.ts).

---

## 1. Conventions

| Sujet | Convention |
| --- | --- |
| Base URL | `http://localhost:8000`. En développement, le front passe par le proxy Vite (`/api/...` → `:8000/...`). Le back autorise aussi CORS pour `localhost:5173` |
| Identifiants | Le champ s'appelle `_id`, comme dans MongoDB. Utilisateurs : `u_` + 8 caractères hexadécimaux (`u_3f9a1c2b`) ; posts : `p_...`. C'est **le même identifiant** dans MongoDB (`_id`) et dans Neo4j (`(:User {id})`) |
| Dates | Chaîne ISO 8601 en UTC (`datetime.now(timezone.utc).isoformat()`) |
| Erreurs | Format FastAPI : `{"detail": "message"}` (`404` inconnu, `409` doublon, `422` validation, `503` base indisponible) |
| Identité de l'utilisateur | Pas de jeton : le front envoie l'identifiant de l'utilisateur connecté dans le corps (`author_id`, `user_id`), comme le prévoient les schémas du back |
| Mot de passe | Jamais renvoyé : le back retire `password_hash` avant de répondre |

---

## 2. Modèle de données

### 2.1 Utilisateur — collection MongoDB `users`

```json
{
  "_id": "u_3f9a1c2b",
  "username": "alice_g",
  "email": "alice@demo.fr",
  "profile": { "full_name": "Alice Moreau", "bio": "Passionnée par Neo4j" },
  "stats": { "followers_count": 12, "following_count": 7 },
  "created_at": "2026-11-23T14:31:00+00:00"
}
```

- `password_hash` est stocké mais **jamais renvoyé**.
- `stats` est une **copie** des compteurs d'abonnés : la vérité est dans Neo4j (les relations `FOLLOWS`),
  mais on garde les compteurs dans MongoDB pour afficher un profil sans interroger Neo4j.
  Conséquence : chaque abonnement met à jour **les deux bases**.

### 2.2 Utilisateur — Neo4j

```cypher
(:User {id: "u_3f9a1c2b", username: "alice_g"})-[:FOLLOWS {since: datetime()}]->(:User {...})
```

### 2.3 Publication — collection MongoDB `posts`

```json
{
  "_id": "p_001",
  "author_id": "u_bob",
  "author_snapshot": { "username": "bob_doc", "full_name": "Bob Martin" },
  "content": { "text": "MongoDB gère les documents polymorphes sans migration de schéma !" },
  "tags": ["mongodb", "nosql"],
  "likes": ["u_alice"],
  "comments": [
    {
      "user_id": "u_alice",
      "author_snapshot": { "username": "alice_g", "full_name": "Alice Moreau" },
      "text": "Tellement vrai !",
      "created_at": "2026-11-23T15:00:00+00:00"
    }
  ],
  "created_at": "2026-11-23T14:31:00+00:00"
}
```

- `author_snapshot` : copie du nom de l'auteur **dans** le post. Le fil s'affiche sans relire la collection
  `users` ; en contrepartie, si l'auteur change de nom, les anciens posts gardent l'ancien.
- `likes` : identifiants des utilisateurs qui aiment le post (le nombre de likes = la longueur de la liste).
- `comments` : commentaires **imbriqués** dans le post (pas de collection séparée).
  ⚪ Le format exact d'un commentaire (`author_snapshot`, `created_at`) est une proposition : le back n'a
  pour l'instant que le schéma d'entrée `CommentCreate {user_id, text}`.

---

## 3. Routes

Légende des bases : 🟢 MongoDB · 🔵 Neo4j.

| Statut | Méthode | Route | Bases | Corps envoyé | Réponse |
| --- | --- | --- | --- | --- | --- |
| ✅ | `POST` | `/auth/register` | 🟢 🔵 | `RegisterRequest` | `201` utilisateur (sans `password_hash`) |
| 🟡 | `POST` | `/auth/login` | 🟢 | `LoginRequest` | ⚪ `200` utilisateur (sans `password_hash`) |
| ⚪ | `GET` | `/users` | 🟢 | — | utilisateurs (`_id`, `username`, `profile`) |
| ⚪ | `GET` | `/users/{id}` | 🟢 | — | utilisateur |
| ⚪ | `GET` | `/users/{id}/posts` | 🟢 | — | posts, plus récent d'abord |
| ⚪ | `GET` | `/users/{id}/following` | 🔵 🟢 | — | utilisateurs |
| ⚪ | `GET` | `/users/{id}/followers` | 🔵 🟢 | — | utilisateurs |
| ⚪ | `POST` | `/users/{id}/follow` | 🔵 🟢 | `{"target_id": "u_..."}` | `204` |
| ⚪ | `DELETE` | `/users/{id}/follow/{target_id}` | 🔵 🟢 | — | `204` |
| ⚪ | `GET` | `/users/{id}/feed?limit=20` | 🔵 🟢 | — | posts, plus récent d'abord |
| ⚪ | `GET` | `/users/{id}/suggestions?limit=10` | 🔵 🟢 | — | `Suggestion[]` |
| 🟡 | `POST` | `/posts` | 🟢 | `PostCreate` | `201` post |
| ⚪ | `POST` | `/posts/{id}/like` | 🟢 | `{"user_id": "u_..."}` | post mis à jour |
| ⚪ | `DELETE` | `/posts/{id}/like/{user_id}` | 🟢 | — | post mis à jour |
| 🟡 | `POST` | `/posts/{id}/comments` | 🟢 | `CommentCreate` | ⚪ post mis à jour |

### Corps des requêtes (schémas Pydantic du back)

```python
class RegisterRequest(BaseModel):   # ✅
    username: str      # 3 à 30 caractères
    email: EmailStr
    password: str      # 8 caractères minimum
    full_name: str
    bio: str = ""

class LoginRequest(BaseModel):      # ✅
    username: str
    password: str

class PostCreate(BaseModel):        # ✅
    author_id: str
    text: str
    tags: list[str] = []

class CommentCreate(BaseModel):     # ✅
    user_id: str
    text: str
```

### `Suggestion` ⚪

```json
{
  "user": { "_id": "u_david", "username": "david_ops", "profile": { "full_name": "David Bernard", "bio": "DevOps & Docker" } },
  "mutual_count": 2,
  "via": [ { "_id": "u_bob", "username": "bob_doc", "profile": { "full_name": "Bob Martin", "bio": "" } } ]
}
```

`mutual_count` = nombre de personnes que je suis et qui suivent cette personne ; `via` = jusqu'à 3 d'entre elles.

---

## 4. Ce que chaque route fait dans les bases

C'est aussi ce que l'API simulée du front affiche dans le panneau « Coulisses ».

### `POST /auth/register` ✅ — double écriture avec retour arrière

```js
// 1. 🟢 MongoDB (le mot de passe est haché avec bcrypt avant)
db.users.insertOne({ _id, username, email, password_hash, profile: { full_name, bio },
                     stats: { followers_count: 0, following_count: 0 }, created_at })
```
```cypher
// 2. 🔵 Neo4j
MERGE (u:User {id: $id}) SET u.username = $username
```
Si l'étape 2 échoue, le back supprime le document créé à l'étape 1 (`delete_one`) et répond `503`.

### `POST /users/{id}/follow` ⚪ — une relation Neo4j + deux compteurs MongoDB

```cypher
MATCH (a:User {id: $id}), (b:User {id: $target_id})
MERGE (a)-[r:FOLLOWS]->(b)
SET r.since = datetime()
```
```js
db.users.updateOne({ _id: id },        { $inc: { "stats.following_count": 1 } })
db.users.updateOne({ _id: target_id }, { $inc: { "stats.followers_count": 1 } })
```
Les compteurs ne doivent être incrémentés **que si la relation n'existait pas déjà** (sinon ils
dérivent). Même logique en `-1` pour le désabonnement.

### `GET /users/{id}/feed` ⚪ — Neo4j puis MongoDB, sans hydratation

```cypher
// 1. 🔵 Qui est-ce que je suis ?
MATCH (:User {id: $id})-[:FOLLOWS]->(f:User) RETURN collect(f.id) AS ids
```
```js
// 2. 🟢 Leurs posts récents (le nom de l'auteur est déjà dans author_snapshot)
db.posts.find({ author_id: { $in: ids } }).sort({ created_at: -1 }).limit(20)
```
L'index MongoDB `{author_id: 1, created_at: -1}` posé au démarrage du back sert exactement cette requête.

### `GET /users/{id}/suggestions` ⚪ — les « amis d'amis »

```cypher
MATCH (me:User {id: $id})-[:FOLLOWS]->(f:User)-[:FOLLOWS]->(s:User)
WHERE s <> me AND NOT (me)-[:FOLLOWS]->(s)
RETURN s.id AS id, count(DISTINCT f) AS mutual_count, collect(DISTINCT f.id)[..3] AS via
ORDER BY mutual_count DESC
LIMIT $limit
```
```js
db.users.find({ _id: { $in: [...ids, ...viaIds] } }, { username: 1, profile: 1 })
```

### `POST /posts` 🟡 — copie de l'auteur dans le post

```js
db.users.findOne({ _id: author_id }, { username: 1, "profile.full_name": 1 })
db.posts.insertOne({ _id, author_id, author_snapshot: { username, full_name }, content: { text },
                     tags, likes: [], comments: [], created_at })
```

### `POST /posts/{id}/like` ⚪ et `POST /posts/{id}/comments` 🟡 — mises à jour atomiques

```js
db.posts.findOneAndUpdate({ _id: id }, { $addToSet: { likes: user_id } }, { returnDocument: "after" })
db.posts.findOneAndUpdate({ _id: id }, { $pull: { likes: user_id } },     { returnDocument: "after" })
db.posts.findOneAndUpdate({ _id: id }, { $push: { comments: { user_id, author_snapshot, text, created_at } } },
                          { returnDocument: "after" })
```
`$addToSet` empêche de liker deux fois. En Python : `find_one_and_update(..., return_document=ReturnDocument.AFTER)`.

---

## 5. Optionnel : en-tête `X-Db-Trace` (panneau « Coulisses »)

**Le front fonctionne sans.** S'il est présent, le front affiche le détail des requêtes exécutées par le back.

Le back peut ajouter à chaque réponse un en-tête HTTP `X-Db-Trace` contenant un tableau JSON
(`json.dumps(..., ensure_ascii=True)`) :

```json
[
  { "db": "neo4j",   "operation": "Abonnements",       "query": "MATCH (:User {id: $id})-[:FOLLOWS]->(f) RETURN collect(f.id)", "duration_ms": 3.2 },
  { "db": "mongodb", "operation": "Posts des abonnés", "query": "db.posts.find({author_id: {$in: [...]}})",                     "duration_ms": 5.8 }
]
```

Mise en œuvre possible : chaque repository ajoute une entrée dans une `contextvars.ContextVar`, et un
middleware la sérialise dans l'en-tête. Si le front appelle l'API depuis une autre origine (sans le
proxy Vite), ajouter `expose_headers=["X-Db-Trace"]` au `CORSMiddleware`.

---

## 6. Points à confirmer avec l'équipe back

1. **Connexion** : URL (`/auth/login` ?) et réponse. Le front suppose qu'elle renvoie l'utilisateur
   (sans `password_hash`), comme `/auth/register`. Si le back choisit plutôt un jeton (`access_token`),
   il faudra adapter `realApi.ts` pour l'envoyer dans l'en-tête `Authorization: Bearer ...`.
2. **Comptes de démo** : `seed.py` met un faux hash (`$2b$12$demo_hash_placeholder`), donc personne ne
   peut se connecter avec ces comptes. Il faut hacher un vrai mot de passe de démo (le même pour tous)
   pour pouvoir changer de compte rapidement pendant la démo.
3. Les routes ⚪ : URL et formats ci-dessus.
4. Les listes d'utilisateurs (`/users`, abonnés, suggestions) ne devraient pas renvoyer `email`.
