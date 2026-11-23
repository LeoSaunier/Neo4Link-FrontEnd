import type {
  FeedItem,
  Post,
  PostCreate,
  Suggestion,
  User,
  UserCreate,
  UserProfile,
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
  listUsers(): Promise<UserSummary[]>
  createUser(input: UserCreate): Promise<User>
  getUserProfile(id: string): Promise<UserProfile>
  getUserPosts(id: string): Promise<Post[]>
  getFollowing(id: string): Promise<UserSummary[]>
  getFollowers(id: string): Promise<UserSummary[]>
  follow(id: string, targetId: string): Promise<void>
  unfollow(id: string, targetId: string): Promise<void>
  getFeed(id: string, limit?: number): Promise<FeedItem[]>
  getSuggestions(id: string, limit?: number): Promise<Suggestion[]>
  createPost(input: PostCreate): Promise<Post>
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
