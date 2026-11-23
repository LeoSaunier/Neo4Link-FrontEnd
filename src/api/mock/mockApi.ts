import type {
  DbTraceEntry,
  FeedItem,
  Post,
  PostCreate,
  Suggestion,
  User,
  UserCreate,
  UserProfile,
  UserSummary,
} from '../../types'
import { ApiError, type Neo4LinkApi } from '../api'
import { addTrace } from '../traceStore'
import { seedFollows, seedPosts, seedUsers } from './seed'

// API simulée : elle respecte le même contrat que le vrai back, mais garde tout en mémoire.
//
// Pour rester fidèle à l'architecture, les données sont rangées comme dans les vraies bases :
//   - `mongo` : les documents complets (profils, publications)
//   - `neo4j` : uniquement des identifiants et des relations FOLLOWS
// Chaque méthode interroge ces deux "bases" dans le même ordre que le ferait le back,
// et note la requête Cypher / MQL équivalente pour le panneau « Coulisses ».
//
// Les données repartent de zéro à chaque rechargement de la page.

const mongo = {
  users: new Map<string, User>(seedUsers.map((u) => [u.id, structuredClone(u)])),
  posts: seedPosts.map((p) => structuredClone(p)),
}

const neo4j = {
  /** Nœuds (:User {id}) */
  nodes: new Set<string>(seedUsers.map((u) => u.id)),
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
async function simulate<T>(
  method: string,
  path: string,
  successStatus: number,
  run: (db: Recorder) => T,
): Promise<T> {
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

/** Affiche une liste d'identifiants de façon lisible dans une requête : ["u01", "u02", … (+8)] */
function ids(list: string[], max = 4): string {
  const shown = list.slice(0, max).map((id) => `"${id}"`)
  if (list.length > max) shown.push(`… (+${list.length - max})`)
  return `[${shown.join(', ')}]`
}

const SUMMARY_PROJECTION = '{ username: 1, display_name: 1, avatar_url: 1, job_title: 1, department: 1 }'

function toSummary(u: User): UserSummary {
  const { id, username, display_name, avatar_url, job_title, department } = u
  return { id, username, display_name, avatar_url, job_title, department }
}

function requireUser(id: string): User {
  const user = mongo.users.get(id)
  if (!user) throw new ApiError(404, `Utilisateur ${id} introuvable`)
  return user
}

function followingOf(id: string): string[] {
  return [...(neo4j.follows.get(id) ?? [])]
}

function followersOf(id: string): string[] {
  const result: string[] = []
  for (const [from, targets] of neo4j.follows) if (targets.has(id)) result.push(from)
  return result
}

/** Hydratation : à partir d'identifiants (venus de Neo4j), récupère les profils dans MongoDB. */
function hydrate(db: Recorder, userIds: string[], operation = 'Hydrater les profils'): UserSummary[] {
  db.mongo(operation, `db.users.find({ _id: { $in: ${ids(userIds)} } }, ${SUMMARY_PROJECTION})`)
  return userIds
    .map((id) => mongo.users.get(id))
    .filter((u): u is User => u !== undefined)
    .map(toSummary)
    .sort((a, b) => a.display_name.localeCompare(b.display_name, 'fr'))
}

const byDateDesc = (a: Post, b: Post) => b.created_at.localeCompare(a.created_at)

function randomId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

// ---------------------------------------------------------------------------
// Implémentation du contrat
// ---------------------------------------------------------------------------

export const mockApi: Neo4LinkApi = {
  listUsers: () =>
    simulate('GET', '/users', 200, (db) => {
      db.mongo('Lister les profils', `db.users.find({}, ${SUMMARY_PROJECTION}).sort({ display_name: 1 })`)
      return [...mongo.users.values()]
        .map(toSummary)
        .sort((a, b) => a.display_name.localeCompare(b.display_name, 'fr'))
    }),

  createUser: (input: UserCreate) =>
    simulate('POST', '/users', 201, (db) => {
      const username = input.username.trim().toLowerCase()
      if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
        throw new ApiError(422, "Nom d'utilisateur invalide (3 à 30 caractères : lettres, chiffres, . _ -)")
      }
      if (!input.display_name.trim()) throw new ApiError(422, 'Le nom affiché est obligatoire')

      db.mongo("Vérifier l'unicité du nom d'utilisateur", `db.users.findOne({ username: "${username}" })`)
      if ([...mongo.users.values()].some((u) => u.username === username)) {
        throw new ApiError(409, `Le nom d'utilisateur « ${username} » est déjà pris`)
      }

      const user: User = {
        id: randomId('u'),
        username,
        display_name: input.display_name.trim(),
        avatar_url: null,
        job_title: input.job_title.trim(),
        department: input.department,
        bio: input.bio.trim(),
        skills: input.skills,
        created_at: new Date().toISOString(),
      }
      // 1. Le document complet va dans MongoDB…
      mongo.users.set(user.id, user)
      const { id, ...fields } = user
      db.mongo('Créer le profil complet', `db.users.insertOne(${JSON.stringify({ _id: id, ...fields }, null, 2)})`)
      // 2. …et seulement l'identifiant dans Neo4j.
      neo4j.nodes.add(user.id)
      db.neo4j('Créer le nœud (identifiant seul)', `MERGE (:User {id: "${user.id}"})`)
      return user
    }),

  getUserProfile: (id) =>
    simulate('GET', `/users/${id}`, 200, (db): UserProfile => {
      db.mongo('Lire le profil', `db.users.findOne({ _id: "${id}" })`)
      const user = requireUser(id)
      db.neo4j(
        "Compter abonnés et abonnements",
        `MATCH (u:User {id: "${id}"})\nRETURN COUNT { (u)<-[:FOLLOWS]-() } AS followers_count,\n       COUNT { (u)-[:FOLLOWS]->() } AS following_count`,
      )
      db.mongo('Compter les publications', `db.posts.countDocuments({ author_id: "${id}" })`)
      return {
        ...user,
        stats: {
          followers_count: followersOf(id).length,
          following_count: followingOf(id).length,
          posts_count: mongo.posts.filter((p) => p.author_id === id).length,
        },
      }
    }),

  getUserPosts: (id) =>
    simulate('GET', `/users/${id}/posts`, 200, (db) => {
      requireUser(id)
      db.mongo("Publications de l'utilisateur", `db.posts.find({ author_id: "${id}" }).sort({ created_at: -1 })`)
      return mongo.posts.filter((p) => p.author_id === id).sort(byDateDesc)
    }),

  getFollowing: (id) =>
    simulate('GET', `/users/${id}/following`, 200, (db) => {
      db.neo4j('Qui cette personne suit-elle ?', `MATCH (:User {id: "${id}"})-[:FOLLOWS]->(f:User)\nRETURN f.id`)
      if (!neo4j.nodes.has(id)) throw new ApiError(404, `Utilisateur ${id} introuvable`)
      return hydrate(db, followingOf(id))
    }),

  getFollowers: (id) =>
    simulate('GET', `/users/${id}/followers`, 200, (db) => {
      db.neo4j('Qui suit cette personne ?', `MATCH (:User {id: "${id}"})<-[:FOLLOWS]-(f:User)\nRETURN f.id`)
      if (!neo4j.nodes.has(id)) throw new ApiError(404, `Utilisateur ${id} introuvable`)
      return hydrate(db, followersOf(id))
    }),

  follow: (id, targetId) =>
    simulate('POST', `/users/${id}/follow`, 204, (db) => {
      if (id === targetId) throw new ApiError(422, 'Impossible de se suivre soi-même')
      db.neo4j(
        "Créer l'abonnement",
        `MATCH (a:User {id: "${id}"}), (b:User {id: "${targetId}"})\nMERGE (a)-[r:FOLLOWS]->(b)\nON CREATE SET r.since = datetime()`,
      )
      if (!neo4j.nodes.has(id) || !neo4j.nodes.has(targetId)) throw new ApiError(404, 'Utilisateur introuvable')
      if (!neo4j.follows.has(id)) neo4j.follows.set(id, new Set())
      neo4j.follows.get(id)!.add(targetId)
    }),

  unfollow: (id, targetId) =>
    simulate('DELETE', `/users/${id}/follow/${targetId}`, 204, (db) => {
      db.neo4j(
        "Supprimer l'abonnement",
        `MATCH (:User {id: "${id}"})-[r:FOLLOWS]->(:User {id: "${targetId}"})\nDELETE r`,
      )
      neo4j.follows.get(id)?.delete(targetId)
    }),

  getFeed: (id, limit = 20) =>
    simulate('GET', `/users/${id}/feed?limit=${limit}`, 200, (db): FeedItem[] => {
      // Étape 1 — Neo4j : de qui dois-je voir les posts ?
      db.neo4j('1. Qui est-ce que je suis ?', `MATCH (:User {id: "${id}"})-[:FOLLOWS]->(f:User)\nRETURN collect(f.id) AS ids`)
      if (!neo4j.nodes.has(id)) throw new ApiError(404, `Utilisateur ${id} introuvable`)
      const followed = followingOf(id)

      // Étape 2 — MongoDB : leurs posts les plus récents
      db.mongo(
        '2. Leurs publications récentes',
        `db.posts.find({ author_id: { $in: ${ids(followed)} } })\n  .sort({ created_at: -1 })\n  .limit(${limit})`,
      )
      const followedSet = new Set(followed)
      const posts = mongo.posts.filter((p) => followedSet.has(p.author_id)).sort(byDateDesc).slice(0, limit)

      // Étape 3 — MongoDB : les profils des auteurs (hydratation)
      const authorIds = [...new Set(posts.map((p) => p.author_id))]
      const authors = new Map(hydrate(db, authorIds, '3. Profils des auteurs').map((u) => [u.id, u]))
      return posts.map((p) => ({ ...p, author: authors.get(p.author_id)! }))
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
      if (!neo4j.nodes.has(id)) throw new ApiError(404, `Utilisateur ${id} introuvable`)

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

      // Hydratation des suggestions et des intermédiaires en une seule requête MongoDB
      const allIds = [...new Set(ranked.flatMap(([s, via]) => [s, ...via.slice(0, 3)]))]
      const profiles = new Map(hydrate(db, allIds, '2. Profils suggérés et intermédiaires').map((u) => [u.id, u]))
      return ranked.map(([s, via]) => ({
        user: profiles.get(s)!,
        mutual_count: via.length,
        via: via.slice(0, 3).map((v) => profiles.get(v)!),
      }))
    }),

  createPost: (input: PostCreate) =>
    simulate('POST', '/posts', 201, (db): Post => {
      requireUser(input.author_id)
      const base = {
        id: randomId('p'),
        author_id: input.author_id,
        tags: input.tags,
        likes_count: 0,
        created_at: new Date().toISOString(),
      }
      let post: Post
      switch (input.type) {
        case 'text':
          if (!input.text.trim()) throw new ApiError(422, 'Le texte est vide')
          post = { ...base, type: 'text', text: input.text.trim() }
          break
        case 'image':
          if (!input.image.url.trim()) throw new ApiError(422, "L'URL de l'image est obligatoire")
          post = { ...base, type: 'image', caption: input.caption, image: input.image }
          break
        case 'poll': {
          const options = input.options.map((o) => o.label.trim()).filter(Boolean)
          if (!input.question.trim()) throw new ApiError(422, 'La question est vide')
          if (options.length < 2) throw new ApiError(422, 'Un sondage a besoin d’au moins 2 options')
          post = { ...base, type: 'poll', question: input.question.trim(), options: options.map((label) => ({ label, votes: 0 })) }
          break
        }
        case 'article': {
          if (!input.title.trim() || !input.body.trim()) throw new ApiError(422, 'Titre et contenu obligatoires')
          const words = input.body.trim().split(/\s+/).length
          post = { ...base, type: 'article', title: input.title.trim(), body: input.body.trim(), reading_time_min: Math.max(1, Math.round(words / 200)) }
          break
        }
      }
      mongo.posts.push(post)
      const { id, ...fields } = post
      db.mongo(`Insérer un post de type « ${post.type} »`, `db.posts.insertOne(${JSON.stringify({ _id: id, ...fields }, null, 2)})`)
      return post
    }),
}
