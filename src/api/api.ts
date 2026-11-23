import type {
  CommentCreate,
  LoginRequest,
  Post,
  PostCreate,
  RegisterRequest,
  Suggestion,
  User,
  UserSummary,
} from '../types'

/**
 * Tout ce que le front peut demander au back.
 *
 * Il existe deux implémentations de cette interface :
 *  - realApi.ts : de vrais appels HTTP vers le back FastAPI (axios)
 *  - mock/mockApi.ts : une fausse API en mémoire, qui imite MongoDB + Neo4j
 *
 * Les pages ne savent pas laquelle elles utilisent : elles importent `api` depuis ./index.ts.
 */
export interface Neo4LinkApi {
  // Authentification
  register(input: RegisterRequest): Promise<User>
  login(input: LoginRequest): Promise<User>

  // Utilisateurs et abonnements
  listUsers(): Promise<UserSummary[]>
  getUser(id: string): Promise<User>
  getUserPosts(id: string): Promise<Post[]>
  getFollowing(id: string): Promise<UserSummary[]>
  getFollowers(id: string): Promise<UserSummary[]>
  follow(id: string, targetId: string): Promise<void>
  unfollow(id: string, targetId: string): Promise<void>
  getFeed(id: string, limit?: number): Promise<Post[]>
  getSuggestions(id: string, limit?: number): Promise<Suggestion[]>

  // Publications (chaque action renvoie le post mis à jour)
  createPost(input: PostCreate): Promise<Post>
  likePost(postId: string, userId: string): Promise<Post>
  unlikePost(postId: string, userId: string): Promise<Post>
  addComment(postId: string, input: CommentCreate): Promise<Post>
}

/** Erreur renvoyée par l'API, avec le code HTTP et le message ("detail") du back. */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
