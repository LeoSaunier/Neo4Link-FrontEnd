import { DEMO_PASSWORD } from '../../config'
import type {
  AuthorSnapshot,
  CommentCreate,
  DbTraceEntry,
  LoginRequest,
  Post,
  PostCreate,
  RegisterRequest,
  Suggestion,
  User,
  UserSummary,
} from '../../types'
import { ApiError, type Neo4LinkApi } from '../api'
import { addTrace } from '../traceStore'
import { seedFollows, seedPosts, seedUsers } from './seed'

// API simulée : elle suit le fonctionnement du back, mais garde tout en mémoire.
//
// Les données sont rangées comme dans les vraies bases :
//   - `mongo` : les documents complets (profils avec leurs compteurs, publications)
//   - `neo4j` : des nœuds (:User {id, username}) et des relations FOLLOWS
// Chaque méthode interroge ces deux "bases" dans le même ordre que le back,
// et note la requête Cypher / MQL équivalente pour le panneau « Coulisses ».
//
// Les données repartent de zéro à chaque rechargement de la page.

const mongo = {
  users: new Map<string, User>(seedUsers.map((u) => [u._id, structuredClone(u)])),
  posts: seedPosts.map((p) => structuredClone(p)),
}

/**
 * Mots de passe de l'API simulée. Le vrai back ne stocke qu'un hash bcrypt (password_hash) ;
 * ici, on garde le mot de passe en mémoire pour pouvoir le vérifier. Les comptes de démo
 * utilisent tous DEMO_PASSWORD.
 */
const passwords = new Map<string, string>(seedUsers.map((u) => [u._id, DEMO_PASSWORD]))

const neo4j = {
  /** Nœuds (:User {id, username}) : id -> username */
  nodes: new Map<string, string>(seedUsers.map((u) => [u._id, u.username])),
  /** Relations (a)-[:FOLLOWS]->(b), rangées par a : id -> ensemble des id suivis */
  follows: new Map<string, Set<string>>(),
}
for (const [from, to] of seedFollows) {
  if (!neo4j.follows.has(from)) neo4j.follows.set(from, new Set())
  neo4j.follows.get(from)!.add(to)
}

// ---------------------------------------------------------------------------
// Petits outils
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Une "base" note ici chaque requête exécutée pendant un appel. */
interface Recorder {
  neo4j(operation: string, query: string): void
  mongo(operation: string, query: string): void
}

/**
 * Simule un appel HTTP : petite latence réseau, exécution, puis ajout au journal des « Coulisses ».
 * Renvoie une copie des données (comme une vraie réponse JSON) pour que le front ne modifie
 * jamais la "base" par accident.
 */
async function simulate<T>(method: string, path: string, successStatus: number, run: (db: Recorder) => T): Promise<T> {
  const start = performance.now()
  const dbTrace: DbTraceEntry[] = []
  const recorder: Recorder = {
    neo4j: (operation, query) => dbTrace.push({ db: 'neo4j', operation, query, duration_ms: null }),
    mongo: (operation, query) => dbTrace.push({ db: 'mongodb', operation, query, duration_ms: null }),
  }
  await sleep(60 + Math.random() * 120)
  try {
    const result = run(recorder)
    addTrace({ method, path, status: successStatus, duration_ms: performance.now() - start, source: 'mock', db: dbTrace })
    return structuredClone(result)
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    addTrace({ method, path, status, duration_ms: performance.now() - start, source: 'mock', db: dbTrace })
    throw error
  }
}

/** Affiche une liste d'identifiants de façon lisible dans une requête : ["u_hiro", "u_yanis", … (+8)] */
function ids(list: string[], max = 3): string {
  const shown = list.slice(0, max).map((id) => `"${id}"`)
  if (list.length > max) shown.push(`… (+${list.length - max})`)
  return `[${shown.join(', ')}]`
}

/** Affiche un document de façon lisible dans une requête (insertOne…). */
const json = (value: unknown) => JSON.stringify(value, null, 2)

const SUMMARY_PROJECTION = '{ username: 1, profile: 1 }'

const toSummary = (u: User): UserSummary => ({ _id: u._id, username: u.username, profile: u.profile })
const snapshotOf = (u: User): AuthorSnapshot => ({ username: u.username, full_name: u.profile.full_name })
const byName = (a: UserSummary, b: UserSummary) => a.profile.full_name.localeCompare(b.profile.full_name, 'fr')
const byDateDesc = (a: Post, b: Post) => b.created_at.localeCompare(a.created_at)

function requireUser(id: string): User {
  const user = mongo.users.get(id)
  if (!user) throw new ApiError(404, `Utilisateur ${id} introuvable`)
  return user
}

function requirePost(id: string): Post {
  const post = mongo.posts.find((p) => p._id === id)
  if (!post) throw new ApiError(404, `Publication ${id} introuvable`)
  return post
}

function requireNode(id: string) {
  if (!neo4j.nodes.has(id)) throw new ApiError(404, `Utilisateur ${id} introuvable`)
}

const followingOf = (id: string) => [...(neo4j.follows.get(id) ?? [])]

function followersOf(id: string): string[] {
  const result: string[] = []
  for (const [from, targets] of neo4j.follows) if (targets.has(id)) result.push(from)
  return result
}

/** À partir d'identifiants (venus de Neo4j), récupère les profils dans MongoDB. */
function hydrate(db: Recorder, userIds: string[], operation = 'Lire les profils'): UserSummary[] {
  if (userIds.length === 0) return [] // rien à demander à MongoDB
  db.mongo(operation, `db.users.find({ _id: { $in: ${ids(userIds)} } }, ${SUMMARY_PROJECTION})`)
  return userIds
    .map((id) => mongo.users.get(id))
    .filter((u): u is User => u !== undefined)
    .map(toSummary)
    .sort(byName)
}

const randomHex = () => crypto.randomUUID().replaceAll('-', '').slice(0, 8)

// ---------------------------------------------------------------------------
// Implémentation du contrat
// ---------------------------------------------------------------------------

export const mockApi: Neo4LinkApi = {
  // ---- Authentification ---------------------------------------------------

  register: (input: RegisterRequest) =>
    simulate('POST', '/auth/register', 201, (db) => {
      // Mêmes règles que le schéma RegisterRequest du back
      if (input.username.length < 3 || input.username.length > 30) {
        throw new ApiError(422, "Le nom d'utilisateur doit faire entre 3 et 30 caractères")
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) throw new ApiError(422, 'Adresse e-mail invalide')
      if (input.password.length < 8) throw new ApiError(422, 'Le mot de passe doit faire au moins 8 caractères')
      if (!input.full_name.trim()) throw new ApiError(422, 'Le nom complet est obligatoire')

      const user: User = {
        _id: `u_${randomHex()}`,
        username: input.username,
        email: input.email,
        profile: { full_name: input.full_name.trim(), bio: input.bio.trim() },
        stats: { followers_count: 0, following_count: 0 },
        created_at: new Date().toISOString(),
      }

      // 1. MongoDB : le document complet (l'index unique sur username refuse les doublons)
      db.mongo(
        'Créer le profil (mot de passe haché avec bcrypt)',
        `db.users.insertOne(${json({ ...user, password_hash: '$2b$12$…' })})`,
      )
      const taken = [...mongo.users.values()].some((u) => u.username === user.username || u.email === user.email)
      if (taken) throw new ApiError(409, "Ce nom d'utilisateur ou cette adresse e-mail est déjà utilisé.")
      mongo.users.set(user._id, user)
      passwords.set(user._id, input.password)

      // 2. Neo4j : le nœud léger (en cas d'échec, le back supprimerait le document MongoDB)
      db.neo4j('Créer le nœud', `MERGE (u:User {id: "${user._id}"})\nSET u.username = "${user.username}"`)
      neo4j.nodes.set(user._id, user.username)
      return user
    }),

  login: (input: LoginRequest) =>
    simulate('POST', '/auth/login', 200, (db) => {
      db.mongo('Trouver le compte', `db.users.findOne({ username: "${input.username}" })`)
      const user = [...mongo.users.values()].find((u) => u.username === input.username)
      // Vérification du mot de passe (bcrypt.checkpw côté back) : même message d'erreur dans les deux cas
      if (!user || passwords.get(user._id) !== input.password) {
        throw new ApiError(401, "Nom d'utilisateur ou mot de passe incorrect.")
      }
      return user
    }),

  // ---- Utilisateurs --------------------------------------------------------

  listUsers: () =>
    simulate('GET', '/users', 200, (db) => {
      db.mongo('Lister les profils', `db.users.find({}, ${SUMMARY_PROJECTION}).sort({ "profile.full_name": 1 })`)
      return [...mongo.users.values()].map(toSummary).sort(byName)
    }),

  getUser: (id) =>
    simulate('GET', `/users/${id}`, 200, (db) => {
      // Les compteurs d'abonnés sont dans le document : pas besoin d'interroger Neo4j
      db.mongo('Lire le profil (compteurs inclus)', `db.users.findOne({ _id: "${id}" }, { password_hash: 0 })`)
      return requireUser(id)
    }),

  getUserPosts: (id) =>
    simulate('GET', `/users/${id}/posts`, 200, (db) => {
      db.mongo("Publications de l'utilisateur", `db.posts.find({ author_id: "${id}" }).sort({ created_at: -1 })`)
      requireUser(id)
      return mongo.posts.filter((p) => p.author_id === id).sort(byDateDesc)
    }),

  getFollowing: (id) =>
    simulate('GET', `/users/${id}/following`, 200, (db) => {
      db.neo4j('Qui cette personne suit-elle ?', `MATCH (:User {id: "${id}"})-[:FOLLOWS]->(f:User)\nRETURN f.id`)
      requireNode(id)
      return hydrate(db, followingOf(id))
    }),

  getFollowers: (id) =>
    simulate('GET', `/users/${id}/followers`, 200, (db) => {
      db.neo4j('Qui suit cette personne ?', `MATCH (:User {id: "${id}"})<-[:FOLLOWS]-(f:User)\nRETURN f.id`)
      requireNode(id)
      return hydrate(db, followersOf(id))
    }),

  follow: (id, targetId) =>
    simulate('POST', `/users/${id}/follow`, 204, (db) => {
      if (id === targetId) throw new ApiError(422, 'Impossible de se suivre soi-même')
      requireNode(id)
      requireNode(targetId)
      const alreadyFollowing = neo4j.follows.get(id)?.has(targetId) ?? false

      // 1. Neo4j : la relation (la vraie source de vérité)
      db.neo4j(
        "Créer l'abonnement",
        `MATCH (a:User {id: "${id}"}), (b:User {id: "${targetId}"})\nMERGE (a)-[r:FOLLOWS]->(b)\nSET r.since = datetime()`,
      )
      if (alreadyFollowing) return // MERGE n'a rien créé : surtout ne pas toucher aux compteurs
      if (!neo4j.follows.has(id)) neo4j.follows.set(id, new Set())
      neo4j.follows.get(id)!.add(targetId)

      // 2. MongoDB : mise à jour des copies des compteurs
      db.mongo('Compteur « abonnements » +1', `db.users.updateOne({ _id: "${id}" }, { $inc: { "stats.following_count": 1 } })`)
      db.mongo('Compteur « abonnés » +1', `db.users.updateOne({ _id: "${targetId}" }, { $inc: { "stats.followers_count": 1 } })`)
      requireUser(id).stats.following_count++
      requireUser(targetId).stats.followers_count++
    }),

  unfollow: (id, targetId) =>
    simulate('DELETE', `/users/${id}/follow/${targetId}`, 204, (db) => {
      const wasFollowing = neo4j.follows.get(id)?.has(targetId) ?? false
      db.neo4j("Supprimer l'abonnement", `MATCH (:User {id: "${id}"})-[r:FOLLOWS]->(:User {id: "${targetId}"})\nDELETE r`)
      if (!wasFollowing) return
      neo4j.follows.get(id)!.delete(targetId)

      db.mongo('Compteur « abonnements » −1', `db.users.updateOne({ _id: "${id}" }, { $inc: { "stats.following_count": -1 } })`)
      db.mongo('Compteur « abonnés » −1', `db.users.updateOne({ _id: "${targetId}" }, { $inc: { "stats.followers_count": -1 } })`)
      requireUser(id).stats.following_count--
      requireUser(targetId).stats.followers_count--
    }),

  getFeed: (id, limit = 20) =>
    simulate('GET', `/users/${id}/feed?limit=${limit}`, 200, (db) => {
      // Étape 1 — Neo4j : de qui dois-je voir les posts ?
      db.neo4j('1. Qui est-ce que je suis ?', `MATCH (:User {id: "${id}"})-[:FOLLOWS]->(f:User)\nRETURN collect(f.id) AS ids`)
      requireNode(id)
      const followed = followingOf(id)
      if (followed.length === 0) return [] // je ne suis personne : inutile d'interroger MongoDB

      // Étape 2 — MongoDB : leurs posts récents. Le nom de l'auteur est déjà dans author_snapshot,
      // donc pas besoin de relire la collection users.
      db.mongo(
        '2. Leurs publications récentes',
        `db.posts.find({ author_id: { $in: ${ids(followed)} } })\n  .sort({ created_at: -1 })\n  .limit(${limit})`,
      )
      const followedSet = new Set(followed)
      return mongo.posts.filter((p) => followedSet.has(p.author_id)).sort(byDateDesc).slice(0, limit)
    }),

  getSuggestions: (id, limit = 10) =>
    simulate('GET', `/users/${id}/suggestions?limit=${limit}`, 200, (db): Suggestion[] => {
      db.neo4j(
        '1. Amis d’amis que je ne suis pas encore',
        `MATCH (me:User {id: "${id}"})-[:FOLLOWS]->(f:User)-[:FOLLOWS]->(s:User)\n` +
          `WHERE s <> me AND NOT (me)-[:FOLLOWS]->(s)\n` +
          `RETURN s.id AS id, count(DISTINCT f) AS mutual_count,\n       collect(DISTINCT f.id)[..3] AS via\n` +
          `ORDER BY mutual_count DESC\nLIMIT ${limit}`,
      )
      requireNode(id)

      // Parcours à 2 sauts : moi -> f -> s
      const mine = new Set(followingOf(id))
      const viaByCandidate = new Map<string, string[]>()
      for (const f of mine) {
        for (const s of followingOf(f)) {
          if (s === id || mine.has(s)) continue
          if (!viaByCandidate.has(s)) viaByCandidate.set(s, [])
          viaByCandidate.get(s)!.push(f)
        }
      }
      const ranked = [...viaByCandidate.entries()]
        .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
        .slice(0, limit)

      // Profils des suggestions et des intermédiaires, en une seule requête MongoDB
      const allIds = [...new Set(ranked.flatMap(([s, via]) => [s, ...via.slice(0, 3)]))]
      const profiles = new Map(hydrate(db, allIds, '2. Profils suggérés et intermédiaires').map((u) => [u._id, u]))
      return ranked.map(([s, via]) => ({
        user: profiles.get(s)!,
        mutual_count: via.length,
        via: via.slice(0, 3).map((v) => profiles.get(v)!),
      }))
    }),

  // ---- Publications -------------------------------------------------------

  createPost: (input: PostCreate) =>
    simulate('POST', '/posts', 201, (db) => {
      if (!input.text.trim()) throw new ApiError(422, 'Le texte est vide')
      db.mongo("Lire le nom de l'auteur", `db.users.findOne({ _id: "${input.author_id}" }, { username: 1, "profile.full_name": 1 })`)
      const author = requireUser(input.author_id)
      const post: Post = {
        _id: `p_${randomHex()}`,
        author_id: author._id,
        author_snapshot: snapshotOf(author), // copie du nom : le fil n'aura pas à relire users
        content: { text: input.text.trim() },
        tags: input.tags,
        likes: [],
        comments: [],
        created_at: new Date().toISOString(),
      }
      db.mongo('Insérer la publication', `db.posts.insertOne(${json(post)})`)
      mongo.posts.push(post)
      return post
    }),

  likePost: (postId, userId) =>
    simulate('POST', `/posts/${postId}/like`, 200, (db) => {
      db.mongo(
        "Ajouter le j'aime ($addToSet : pas de doublon)",
        `db.posts.findOneAndUpdate(\n  { _id: "${postId}" },\n  { $addToSet: { likes: "${userId}" } },\n  { returnDocument: "after" }\n)`,
      )
      const post = requirePost(postId)
      if (!post.likes.includes(userId)) post.likes.push(userId)
      return post
    }),

  unlikePost: (postId, userId) =>
    simulate('DELETE', `/posts/${postId}/like/${userId}`, 200, (db) => {
      db.mongo(
        "Retirer le j'aime",
        `db.posts.findOneAndUpdate(\n  { _id: "${postId}" },\n  { $pull: { likes: "${userId}" } },\n  { returnDocument: "after" }\n)`,
      )
      const post = requirePost(postId)
      post.likes = post.likes.filter((id) => id !== userId)
      return post
    }),

  addComment: (postId, input: CommentCreate) =>
    simulate('POST', `/posts/${postId}/comments`, 200, (db) => {
      if (!input.text.trim()) throw new ApiError(422, 'Le commentaire est vide')
      db.mongo("Lire le nom de l'auteur du commentaire", `db.users.findOne({ _id: "${input.user_id}" }, { username: 1, "profile.full_name": 1 })`)
      const author = requireUser(input.user_id)
      const comment = {
        user_id: author._id,
        author_snapshot: snapshotOf(author),
        text: input.text.trim(),
        created_at: new Date().toISOString(),
      }
      db.mongo(
        'Ajouter le commentaire dans le post ($push)',
        `db.posts.findOneAndUpdate(\n  { _id: "${postId}" },\n  { $push: { comments: ${JSON.stringify(comment)} } },\n  { returnDocument: "after" }\n)`,
      )
      const post = requirePost(postId)
      post.comments.push(comment)
      return post
    }),
}
