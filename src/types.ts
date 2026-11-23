// Types TypeScript = miroir exact du contrat d'API (docs/API_CONTRACT.md).
// Côté back, les mêmes structures existent sous forme de modèles Pydantic.
// Si le back change un champ, TypeScript signale à la compilation tous les endroits du front à corriger.

// ---------------------------------------------------------------------------
// Utilisateurs (collection MongoDB "users" + nœud Neo4j (:User {id}))
// ---------------------------------------------------------------------------

/** Version courte d'un utilisateur : listes, auteur d'un post, suggestions. */
export interface UserSummary {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  job_title: string
  department: string
}

/** Profil complet tel que stocké dans MongoDB. */
export interface User extends UserSummary {
  bio: string
  skills: string[]
  created_at: string
}

/** Compteurs du profil : ils viennent de deux bases différentes. */
export interface UserStats {
  followers_count: number // Neo4j
  following_count: number // Neo4j
  posts_count: number // MongoDB
}

/** Réponse de GET /users/{id} : document MongoDB + compteurs. */
export interface UserProfile extends User {
  stats: UserStats
}

/** Corps de POST /users. */
export interface UserCreate {
  username: string
  display_name: string
  job_title: string
  department: string
  bio: string
  skills: string[]
}

// ---------------------------------------------------------------------------
// Publications (collection MongoDB "posts") : documents polymorphes
// ---------------------------------------------------------------------------
// Chaque type de post a ses propres champs. En TypeScript, on modélise ça avec une
// "union discriminée" : le champ `type` permet de savoir quels autres champs existent.
// C'est l'équivalent côté front de la flexibilité de schéma de MongoDB.

interface PostBase {
  id: string
  author_id: string
  tags: string[]
  likes_count: number
  created_at: string
}

export interface TextPost extends PostBase {
  type: 'text'
  text: string
}

export interface ImageInfo {
  url: string
  alt?: string
  width?: number
  height?: number
  exif?: Record<string, string>
}

export interface ImagePost extends PostBase {
  type: 'image'
  caption?: string
  image: ImageInfo
}

export interface PollOption {
  label: string
  votes: number
}

export interface PollPost extends PostBase {
  type: 'poll'
  question: string
  options: PollOption[]
  closes_at?: string
}

export interface ArticlePost extends PostBase {
  type: 'article'
  title: string
  body: string
  reading_time_min: number
}

export type Post = TextPost | ImagePost | PollPost | ArticlePost
export type PostType = Post['type'] // 'text' | 'image' | 'poll' | 'article'

/** Corps de POST /posts : comme un Post, sans les champs que le back calcule. */
type CreateFields<P> = Omit<P, 'id' | 'likes_count' | 'created_at'>
export type PostCreate =
  | CreateFields<TextPost>
  | CreateFields<ImagePost>
  | (Omit<CreateFields<PollPost>, 'options'> & { options: { label: string }[] })
  | Omit<CreateFields<ArticlePost>, 'reading_time_min'>

/** Un élément du fil : le post (MongoDB) + son auteur (MongoDB), choisis grâce à Neo4j. */
export type FeedItem = Post & { author: UserSummary }

// ---------------------------------------------------------------------------
// Suggestions (calculées par Neo4j, hydratées par MongoDB)
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
