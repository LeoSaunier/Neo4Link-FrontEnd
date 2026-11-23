import axios from 'axios'
import type {
  CommentCreate,
  DbTraceEntry,
  LoginRequest,
  Post,
  PostCreate,
  RegisterRequest,
  Suggestion,
  User,
  UserSummary,
} from '../types'
import { ApiError, type Neo4LinkApi } from './api'
import { addTrace } from './traceStore'

// Implémentation "réelle" : de vrais appels HTTP vers le back FastAPI.
// baseURL '/api' : le proxy de Vite (vite.config.ts) retransmet vers http://localhost:8000.
const http = axios.create({ baseURL: '/api' })

type Method = 'GET' | 'POST' | 'DELETE'

/**
 * Envoie une requête, mesure sa durée et l'enregistre dans le journal des « Coulisses ».
 * Toutes les fonctions plus bas passent par ici.
 */
async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const start = performance.now()
  try {
    const response = await http.request<T>({ method, url: path, data: body })
    addTrace({
      method,
      path,
      status: response.status,
      duration_ms: performance.now() - start,
      source: 'api',
      db: parseDbTrace(response.headers['x-db-trace']),
    })
    return response.data
  } catch (error) {
    const response = axios.isAxiosError(error) ? error.response : undefined
    addTrace({
      method,
      path,
      status: response?.status ?? 'réseau',
      duration_ms: performance.now() - start,
      source: 'api',
      db: parseDbTrace(response?.headers['x-db-trace']),
    })
    if (!response) {
      throw new ApiError(0, 'Le back ne répond pas. Est-il démarré sur le port 8000 ?')
    }
    throw new ApiError(response.status, extractDetail(response.data))
  }
}

/** Lit l'en-tête optionnel X-Db-Trace (tableau JSON). Renvoie null s'il est absent ou invalide. */
function parseDbTrace(header: unknown): DbTraceEntry[] | null {
  if (typeof header !== 'string') return null
  try {
    const parsed: unknown = JSON.parse(header)
    return Array.isArray(parsed) ? (parsed as DbTraceEntry[]) : null
  } catch {
    return null
  }
}

/** FastAPI renvoie {"detail": "..."} ou, pour une erreur de validation (422), {"detail": [{msg}, ...]}. */
function extractDetail(data: unknown): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail.map((d) => (d && typeof d === 'object' && 'msg' in d ? String(d.msg) : String(d))).join(' ; ')
    }
  }
  return 'Erreur inattendue du serveur'
}

const enc = encodeURIComponent

// Toutes les URL du back sont ici. Voir docs/API_CONTRACT.md pour le statut de chaque route
// (certaines sont encore des propositions : si le back choisit une autre URL, c'est la seule ligne à changer).
export const realApi: Neo4LinkApi = {
  register: (input: RegisterRequest) => request<User>('POST', '/auth/register', input),
  login: (input: LoginRequest) => request<User>('POST', '/auth/login', input),

  listUsers: () => request<UserSummary[]>('GET', '/users'),
  getUser: (id) => request<User>('GET', `/users/${enc(id)}`),
  getUserPosts: (id) => request<Post[]>('GET', `/users/${enc(id)}/posts`),
  getFollowing: (id) => request<UserSummary[]>('GET', `/users/${enc(id)}/following`),
  getFollowers: (id) => request<UserSummary[]>('GET', `/users/${enc(id)}/followers`),
  follow: (id, targetId) => request<void>('POST', `/users/${enc(id)}/follow`, { target_id: targetId }),
  unfollow: (id, targetId) => request<void>('DELETE', `/users/${enc(id)}/follow/${enc(targetId)}`),
  getFeed: (id, limit = 20) => request<Post[]>('GET', `/users/${enc(id)}/feed?limit=${limit}`),
  getSuggestions: (id, limit = 10) => request<Suggestion[]>('GET', `/users/${enc(id)}/suggestions?limit=${limit}`),

  createPost: (input: PostCreate) => request<Post>('POST', '/posts', input),
  likePost: (postId, userId) => request<Post>('POST', `/posts/${enc(postId)}/like`, { user_id: userId }),
  unlikePost: (postId, userId) => request<Post>('DELETE', `/posts/${enc(postId)}/like/${enc(userId)}`),
  addComment: (postId, input: CommentCreate) => request<Post>('POST', `/posts/${enc(postId)}/comments`, input),
}
