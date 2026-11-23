import type { AuthorSnapshot, Comment, Post, User } from '../../types'

// Jeu de données de démonstration de l'API simulée, au format des documents du back.
//
// Le réseau d'abonnements reprend le « Karate Club de Zachary » (1977) : 34 membres d'un club
// de karaté et leurs 78 liens d'amitié. Le club s'est scindé en deux camps, ce qui donne deux
// communautés bien visibles dans le graphe. Ici, les deux camps deviennent deux services :
//   - camp de l'instructeur (nœud 0)  -> R&D,        dirigée par Hiro Tanaka (u_hiro)
//   - camp du président (nœud 33)     -> Commercial, dirigé par Jean Arnaud (u_jean)

// ---------------------------------------------------------------------------
// Utilisateurs (collection MongoDB "users")
// ---------------------------------------------------------------------------

// [clé, nom complet, bio] — l'index correspond au nœud du Karate Club
const PEOPLE: [string, string, string][] = [
  ['hiro', 'Hiro Tanaka', 'Directeur R&D — ancien instructeur de karaté, toujours passionné par les graphes.'],
  ['camille', 'Camille Laurent', 'Lead développeuse back-end (R&D) — API, bases de données et café.'],
  ['yanis', 'Yanis Belkacem', 'Ingénieur data (R&D) — je fais le lien entre la R&D et le commercial.'],
  ['sophie', 'Sophie Moreau', 'Développeuse full-stack (R&D) — du pixel à la base de données.'],
  ['lucas', 'Lucas Petit', 'Stagiaire R&D — étudiant en master, en stage pour 6 mois.'],
  ['ines', 'Inès Haddad', "Ingénieure QA (R&D) — si ce n'est pas testé, ça ne marche pas."],
  ['thomas', 'Thomas Girard', 'Ingénieur DevOps (R&D) — conteneurs, pipelines et astreintes.'],
  ['emma', 'Emma Rousseau', 'Product owner (R&D) — je transforme les besoins en fonctionnalités.'],
  ['karim', 'Karim Benali', 'Data scientist (R&D) — détection de communautés et recommandations.'],
  ['manon', 'Manon Chevalier', "Chargée d'affaires (Commercial) — toujours entre deux rendez-vous."],
  ['lea', 'Léa Fontaine', 'Ingénieure sécurité (R&D) — activez la double authentification. Merci.'],
  ['nathan', 'Nathan Leroy', "Développeur mobile (R&D) — j'écris l'appli mobile de l'intranet."],
  ['chloe', 'Chloé Mercier', 'UX designer (R&D) — des interfaces simples et accessibles à tous.'],
  ['antoine', 'Antoine Faure', 'Architecte logiciel (R&D) — une base de données par besoin, pas une de plus.'],
  ['paul', 'Paul Garnier', 'Commercial terrain (Commercial) — région Centre-Val de Loire.'],
  ['amina', 'Amina Diallo', 'Responsable grands comptes (Commercial).'],
  ['julie', 'Julie Bernard', 'Administratrice systèmes (R&D) — serveurs, réseau et VPN.'],
  ['maxime', 'Maxime Durand', 'Développeur back-end (R&D) — Go, Python et performances.'],
  ['louis', 'Louis Martin', 'Business developer (Commercial) — à la recherche de nouveaux marchés.'],
  ['sarah', 'Sarah Cohen', 'Data analyst (R&D) — les chiffres racontent des histoires.'],
  ['clara', 'Clara Dupuis', 'Chargée de marketing (Commercial) — contenus, référencement et campagnes.'],
  ['hugo', 'Hugo Lambert', 'Développeur front-end (R&D) — animations fluides et composants réutilisables.'],
  ['mehdi', 'Mehdi Saïdi', 'Ingénieur avant-vente (Commercial) — je montre aux clients ce que fait le produit.'],
  ['alice', 'Alice Robert', 'Responsable marketing (Commercial) — salons, marque et communication.'],
  ['romain', 'Romain Blanc', 'Commercial sédentaire (Commercial) — au téléphone toute la journée.'],
  ['eva', 'Éva Morel', 'Customer success manager (Commercial) — des clients heureux, des clients fidèles.'],
  ['victor', 'Victor Henry', 'Juriste commercial (Commercial) — contrats, CGV et conformité.'],
  ['zoe', 'Zoé Lefèvre', 'Chargée de communication (Commercial) — blog, newsletter et réseaux sociaux.'],
  ['samuel', 'Samuel Nguyen', 'Analyste commercial (Commercial) — prévisions et reporting des ventes.'],
  ['lina', 'Lina Mansouri', 'Responsable partenariats (Commercial) — universités et partenaires technologiques.'],
  ['arthur', 'Arthur Simon', 'Ingénieur commercial (Commercial) — solutions cloud pour les PME.'],
  ['nora', 'Nora Benoit', 'Responsable administration des ventes (Commercial).'],
  ['gabriel', 'Gabriel Roux', 'Directeur commercial adjoint (Commercial) — bras droit de Jean.'],
  ['jean', 'Jean Arnaud', "Directeur commercial — ancien président du club de karaté."],
]

/** Index du Karate Club (0..33) -> identifiant (u_hiro, u_camille…), au format des identifiants du back. */
const idOf = (index: number) => `u_${PEOPLE[index][0]}`

/** "Hiro Tanaka" -> "hiro_t" */
function usernameOf(key: string, fullName: string) {
  const lastName = fullName.split(' ').slice(1).join('')
  return `${key}_${lastName[0].toLowerCase()}`
}

const now = Date.now()
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString()

// ---------------------------------------------------------------------------
// Abonnements (Neo4j : (:User)-[:FOLLOWS]->(:User))
// ---------------------------------------------------------------------------

// Les 78 liens d'amitié du Karate Club (non orientés, indices 0..33)
const KARATE_EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 10], [0, 11], [0, 12], [0, 13], [0, 17], [0, 19], [0, 21], [0, 31],
  [1, 2], [1, 3], [1, 7], [1, 13], [1, 17], [1, 19], [1, 21], [1, 30],
  [2, 3], [2, 7], [2, 8], [2, 9], [2, 13], [2, 27], [2, 28], [2, 32],
  [3, 7], [3, 12], [3, 13],
  [4, 6], [4, 10],
  [5, 6], [5, 10], [5, 16],
  [6, 16],
  [8, 30], [8, 32], [8, 33],
  [9, 33],
  [13, 33],
  [14, 32], [14, 33],
  [15, 32], [15, 33],
  [18, 32], [18, 33],
  [19, 33],
  [20, 32], [20, 33],
  [22, 32], [22, 33],
  [23, 25], [23, 27], [23, 29], [23, 32], [23, 33],
  [24, 25], [24, 27], [24, 31],
  [25, 31],
  [26, 29], [26, 33],
  [27, 33],
  [28, 31], [28, 33],
  [29, 32], [29, 33],
  [30, 32], [30, 33],
  [31, 32], [31, 33],
  [32, 33],
]

// Une amitié est réciproque, un abonnement ne l'est pas forcément.
// Chaque lien devient deux abonnements (a -> b et b -> a), sauf pour environ 1 lien sur 5
// où seul le membre d'indice le plus grand suit l'autre.
export const seedFollows: [string, string][] = KARATE_EDGES.flatMap(([a, b]): [string, string][] =>
  (a * 3 + b) % 5 === 0
    ? [[idOf(b), idOf(a)]]
    : [
        [idOf(a), idOf(b)],
        [idOf(b), idOf(a)],
      ],
)

// ---------------------------------------------------------------------------
// Documents utilisateurs : les compteurs `stats` sont calculés à partir des abonnements,
// comme le fait le seed.py du back avec $inc.
// ---------------------------------------------------------------------------

export const seedUsers: User[] = PEOPLE.map(([key, full_name, bio], i) => {
  const id = idOf(i)
  return {
    _id: id,
    username: usernameOf(key, full_name),
    email: `${usernameOf(key, full_name)}@demo.fr`,
    profile: { full_name, bio },
    stats: {
      followers_count: seedFollows.filter(([, to]) => to === id).length,
      following_count: seedFollows.filter(([from]) => from === id).length,
    },
    created_at: hoursAgo(24 * (60 - i)),
  }
})

const snapshotOf = (id: string): AuthorSnapshot => {
  const user = seedUsers.find((u) => u._id === id)!
  return { username: user.username, full_name: user.profile.full_name }
}

// ---------------------------------------------------------------------------
// Publications (collection MongoDB "posts")
// ---------------------------------------------------------------------------

/** Liste déterministe de `count` utilisateurs (hors auteur) qui ont aimé un post. */
function likesFor(postIndex: number, authorId: string, count: number): string[] {
  const likes: string[] = []
  for (let k = 0; likes.length < count && k < PEOPLE.length; k++) {
    const id = idOf((postIndex * 7 + k * 5) % PEOPLE.length)
    if (id !== authorId && !likes.includes(id)) likes.push(id)
  }
  return likes
}

// [auteur, il y a N heures, texte, tags, nombre de likes, commentaires [auteur, texte, N heures après le post]]
type PostSpec = [string, number, string, string[], number, [string, string, number][]?]

const POSTS: PostSpec[] = [
  ['hiro', 2,
    "Pourquoi un graphe pour notre réseau interne ?\n\nPour suggérer des collègues, il faut regarder les abonnements de mes abonnements, puis les leurs… Dans Neo4j, chaque nœud garde des références directes vers ses relations (« index-free adjacency ») : passer d'un nœud à ses voisins ne demande aucune recherche dans un index global.\n\nNeo4j garde donc uniquement les identifiants et les relations ; MongoDB stocke les profils et les publications.",
    ['neo4j', 'architecture'], 24,
    [['karim', 'Et le coût d’un saut dépend du nombre de voisins, pas de la taille de la base 👌', 1], ['antoine', 'Exactement la logique de la persistance polyglotte.', 1.5]]],
  ['jean', 5, "Record battu ce trimestre 🎉 Merci à toute l'équipe commerciale, et en particulier à Amina et Gabriel pour le contrat signé hier soir.", ['ventes', 'équipe'], 31,
    [['amina', 'Merci Jean, quelle équipe !', 0.5], ['gabriel', 'On continue sur cette lancée 💪', 1], ['hiro', 'Bravo à tous !', 2]]],
  ['camille', 9, "Astuce MongoDB : un index composé { author_id: 1, created_at: -1 } rend la requête du fil d'actualité très rapide, même avec des millions de posts.", ['mongodb', 'performance'], 18,
    [['maxime', 'C’est l’index que le back pose au démarrage, non ?', 1], ['camille', 'Oui, dans databases.py 😉', 1.2]]],
  ['yanis', 12, 'Petit sondage : quel langage de requête préférez-vous ? Cypher, MQL ou SQL ? Répondez en commentaire 👇', ['sondage', 'data'], 7,
    [['karim', 'Cypher, sans hésiter.', 0.5], ['sarah', 'SQL, la vieille école !', 1], ['camille', 'MQL pour les documents, Cypher pour le graphe.', 2]]],
  ['alice', 20, 'Notre stand au salon Data & IA de Lyon a attiré beaucoup de monde ! Merci à toute l’équipe marketing.', ['événement', 'marketing'], 27,
    [['clara', 'Super ambiance, vivement le prochain !', 2]]],
  ['sophie', 26, "Le nouveau design system est en ligne ✨ Tous les composants sont documentés, n'hésitez pas à me faire des retours.", ['front', 'design'], 12],
  ['karim', 30,
    "Détecter des communautés avec Louvain : l'algorithme regroupe les nœuds en maximisant la modularité (beaucoup de liens dans les groupes, peu entre eux). Sur notre réseau interne, il retrouve sans surprise les deux grands services, la R&D et le commercial.",
    ['graphes', 'data-science'], 15],
  ['amina', 34, "Qui serait dispo jeudi pour un déjeuner d'équipe ? 🍕", ['équipe'], 9,
    [['paul', 'Moi !', 0.3], ['louis', 'Présent aussi.', 0.5]]],
  ['thomas', 40, 'Le nouveau cluster Kubernetes est en production 🚀', ['devops'], 14],
  ['gabriel', 46, 'Séminaire de janvier : présentiel à Tours ou hybride ? Donnez votre avis en commentaire.', ['séminaire'], 6,
    [['nora', 'Présentiel, ça fait du bien de se voir.', 1], ['eva', 'Hybride pour ceux qui sont loin.', 3]]],
  ['emma', 52, 'Rétro du sprint 42 : on a livré la recherche de collègues par compétences. Prochaine étape : les recommandations de mentors.', ['produit', 'agile'], 10],
  ['zoe', 58, "Notre article sur la culture d'entreprise vient de sortir sur le blog. Merci à tous ceux qui ont participé aux interviews !", ['communication'], 13],
  ['antoine', 64,
    "Persistance polyglotte : plutôt que de forcer toutes les données dans un seul moteur, on choisit le meilleur outil pour chaque besoin. MongoDB pour les documents, Neo4j pour le graphe. Le prix à payer : garder les deux bases cohérentes, avec l'identifiant utilisateur comme clé commune.",
    ['architecture', 'nosql'], 21],
  ['eva', 70, "Un client vient de nous dire que notre onboarding était « le plus simple qu'il ait connu ». Ça fait plaisir 😊", ['clients'], 17],
  ['lea', 76, "Rappel : activez la double authentification sur vos comptes. Je passe dans les bureaux cet après-midi si vous avez besoin d'aide.", ['sécurité'], 8],
  ['lina', 82, "Signature du partenariat avec l'université de Tours ✍️", ['partenariat'], 22],
  ['chloe', 88, "Thème sombre par défaut sur l'intranet : pour ou contre ?", ['ux'], 5,
    [['hugo', 'Pour !', 1], ['nathan', 'Selon le réglage du système, idéalement.', 2]]],
  ['sarah', 94, 'Le tableau de bord des ventes est mis à jour en temps réel depuis ce matin 📊', ['data', 'ventes'], 11],
  ['mehdi', 100, 'Démo client réussie ce matin : la visualisation du graphe des relations a fait son effet.', ['avant-vente'], 9],
  ['ines', 106, "Couverture de tests à 87 % sur l'API. Objectif 90 % avant la fin du mois !", ['qualité'], 7],
  ['lucas', 118, "Premier jour terminé, merci pour l'accueil ! J'ai déjà appris ce qu'est un nœud et une relation 😄", ['stage'], 16,
    [['hiro', 'Bienvenue Lucas !', 0.5]]],
  ['maxime', 128, "Quelqu'un a déjà migré de Motor vers AsyncMongoClient (PyMongo) ? Retours bienvenus.", ['python', 'mongodb'], 4,
    [['camille', 'Oui, c’est presque un rechercher-remplacer. Attention à to_list(None).', 2]]],
  ['manon', 136, 'Trois nouveaux rendez-vous décrochés cette semaine, la prospection paie !', ['ventes'], 8],
  ['nora', 160, "Clôture mensuelle terminée. Merci à tous pour l'envoi rapide des bons de commande.", ['adv'], 3],
  ['julie', 180, 'Maintenance du réseau samedi de 8 h à 12 h : le VPN sera coupé.', ['infra'], 5],
  ['paul', 190, 'Belle journée de terrain à Orléans, deux devis signés.', ['terrain'], 6],
  ['nathan', 200, "La nouvelle version de l'appli mobile est disponible sur les stores 📱", ['mobile'], 13],
  ['victor', 210, "Nouvelle version des CGV disponible sur l'intranet, à utiliser à partir de lundi.", ['juridique'], 4],
]

export const seedPosts: Post[] = POSTS.map(([author, ago, text, tags, likesCount, comments = []], i) => {
  const authorId = `u_${author}`
  return {
    _id: `p_${String(i + 1).padStart(3, '0')}`,
    author_id: authorId,
    author_snapshot: snapshotOf(authorId),
    content: { text },
    tags,
    likes: likesFor(i, authorId, likesCount),
    comments: comments.map(
      ([commenter, commentText, after]): Comment => ({
        user_id: `u_${commenter}`,
        author_snapshot: snapshotOf(`u_${commenter}`),
        text: commentText,
        created_at: hoursAgo(ago - after),
      }),
    ),
    created_at: hoursAgo(ago),
  }
})
