// Types TypeScript = miroir des données du back (docs/API_CONTRACT.md).
// Les noms de champs sont ceux des documents MongoDB du back (`_id`, `profile.full_name`, `content.text`…).
// Si le back change un champ, TypeScript signale à la compilation tous les endroits du front à corriger.

// ---------------------------------------------------------------------------
// Utilisateurs (collection MongoDB "users" + nœud Neo4j (:User {id, username}))
// ---------------------------------------------------------------------------

export interface UserProfileInfo {
  full_name: string
  bio: string
}

/**
 * Copie des compteurs d'abonnés, stockée dans MongoDB.
 * La vérité est dans Neo4j (les relations FOLLOWS) ; le back met les deux à jour à chaque abonnement.
 */
export interface UserStats {
  followers_count: number
  following_count: number
}

/** Utilisateur tel que renvoyé par le back (le document MongoDB, sans password_hash). */
export interface User {
  _id: string
  username: string
  email: string
  profile: UserProfileInfo
  stats: UserStats
  created_at: string
}

/** Version courte, utilisée dans les listes (abonnés, suggestions, annuaire). */
export type UserSummary = Pick<User, '_id' | 'username' | 'profile'>

/** Corps de POST /auth/register (schéma RegisterRequest du back). */
export interface RegisterRequest {
  username: string
  email: string
  password: string
  full_name: string
  bio: string
}

/** Corps de POST /auth/login (schéma LoginRequest du back). */
export interface LoginRequest {
  username: string
  password: string
}

// ---------------------------------------------------------------------------
// Publications (collection MongoDB "posts")
// ---------------------------------------------------------------------------

/** Copie du nom de l'auteur, enregistrée dans le post au moment de sa création. */
export interface AuthorSnapshot {
  username: string
  full_name: string
}

/** Commentaire imbriqué dans le post (tableau `comments`). */
export interface Comment {
  user_id: string
  author_snapshot: AuthorSnapshot
  text: string
  created_at: string
}

export interface Post {
  _id: string
  author_id: string
  author_snapshot: AuthorSnapshot
  content: { text: string }
  tags: string[]
  /** Identifiants des utilisateurs qui aiment ce post. */
  likes: string[]
  comments: Comment[]
  created_at: string
}

/** Corps de POST /posts (schéma PostCreate du back). */
export interface PostCreate {
  author_id: string
  text: string
  tags: string[]
}

/** Corps de POST /posts/{id}/comments (schéma CommentCreate du back). */
export interface CommentCreate {
  user_id: string
  text: string
}

// ---------------------------------------------------------------------------
// Suggestions (calculées par Neo4j, complétées par MongoDB)
// ---------------------------------------------------------------------------

export interface Suggestion {
  user: UserSummary
  /** Nombre de personnes que je suis et qui suivent cette personne. */
  mutual_count: number
  /** Jusqu'à 3 de ces intermédiaires. */
  via: UserSummary[]
}

// ---------------------------------------------------------------------------
// Trace des requêtes en base (en-tête optionnel X-Db-Trace)
// ---------------------------------------------------------------------------

export type DbName = 'mongodb' | 'neo4j'

export interface DbTraceEntry {
  db: DbName
  /** Description courte, ex. "Abonnements de l'utilisateur". */
  operation: string
  /** Requête Cypher ou MQL exécutée. */
  query: string
  /** Durée mesurée par le back ; null quand elle n'est pas connue (API simulée). */
  duration_ms: number | null
}
