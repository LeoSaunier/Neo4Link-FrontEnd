import type { Post, User } from '../../types'

// Jeu de données de démonstration de l'API simulée.
//
// Le réseau d'abonnements reprend le « Karate Club de Zachary » (1977) : 34 membres d'un club
// de karaté et leurs 78 liens d'amitié. Le club s'est scindé en deux camps, ce qui donne deux
// communautés bien visibles dans le graphe. Ici, les deux camps deviennent deux services :
//   - camp de l'instructeur (nœud 0)  -> service « R&D »,       dirigé par Hiro Tanaka (u01)
//   - camp du président (nœud 33)     -> service « Commercial », dirigé par Jean Arnaud (u34)

// ---------------------------------------------------------------------------
// Utilisateurs (ce qui sera dans la collection MongoDB "users")
// ---------------------------------------------------------------------------

const RD = 'R&D'
const SALES = 'Commercial'

// [username, nom affiché, poste, service, compétences, bio] — l'index correspond au nœud du Karate Club
const PEOPLE: [string, string, string, string, string[], string][] = [
  ['hiro', 'Hiro Tanaka', 'Directeur R&D', RD, ['Leadership', 'Architecture', 'Python'], 'Je dirige la R&D. Ancien instructeur de karaté, toujours passionné par les graphes.'],
  ['camille', 'Camille Laurent', 'Lead développeuse back-end', RD, ['Python', 'FastAPI', 'MongoDB'], "API, bases de données et café. Beaucoup de café."],
  ['yanis', 'Yanis Belkacem', 'Ingénieur data', RD, ['Neo4j', 'Cypher', 'Spark'], 'Je fais le lien entre la R&D et le commercial : tableaux de bord et analyses de réseau.'],
  ['sophie', 'Sophie Moreau', 'Développeuse full-stack', RD, ['React', 'TypeScript', 'Node.js'], "Du pixel à la base de données."],
  ['lucas', 'Lucas Petit', 'Stagiaire R&D', RD, ['Python', 'Git'], 'Étudiant en master, en stage pour 6 mois.'],
  ['ines', 'Inès Haddad', 'Ingénieure QA', RD, ['Tests', 'Cypress', 'CI'], "Si ce n'est pas testé, ça ne marche pas."],
  ['thomas', 'Thomas Girard', 'Ingénieur DevOps', RD, ['Docker', 'Kubernetes', 'Linux'], 'Conteneurs, pipelines et astreintes.'],
  ['emma', 'Emma Rousseau', 'Product owner', RD, ['Agile', 'UX', 'Roadmap'], 'Je transforme les besoins en fonctionnalités.'],
  ['karim', 'Karim Benali', 'Data scientist', RD, ['Python', 'Machine learning', 'Pandas'], 'Détection de communautés et recommandations.'],
  ['manon', 'Manon Chevalier', "Chargée d'affaires", SALES, ['Prospection', 'CRM'], 'Toujours entre deux rendez-vous clients.'],
  ['lea', 'Léa Fontaine', 'Ingénieure sécurité', RD, ['Sécurité', 'OAuth', 'Pentest'], 'Activez la double authentification. Merci.'],
  ['nathan', 'Nathan Leroy', 'Développeur mobile', RD, ['Kotlin', 'Swift'], "J'écris l'appli mobile de l'intranet."],
  ['chloe', 'Chloé Mercier', 'UX designer', RD, ['Figma', 'UX', 'Accessibilité'], 'Des interfaces simples et accessibles à tous.'],
  ['antoine', 'Antoine Faure', 'Architecte logiciel', RD, ['Architecture', 'Java', 'Microservices'], 'Une base de données par besoin, pas une de plus.'],
  ['paul', 'Paul Garnier', 'Commercial terrain', SALES, ['Négociation'], 'Région Centre-Val de Loire.'],
  ['amina', 'Amina Diallo', 'Responsable grands comptes', SALES, ['Grands comptes', 'Négociation'], 'Je m’occupe de nos plus gros clients.'],
  ['julie', 'Julie Bernard', 'Administratrice systèmes', RD, ['Linux', 'Réseau'], 'Serveurs, réseau et VPN.'],
  ['maxime', 'Maxime Durand', 'Développeur back-end', RD, ['Go', 'Python', 'PostgreSQL'], 'Back-end et performances.'],
  ['louis', 'Louis Martin', 'Business developer', SALES, ['Prospection', 'Réseaux sociaux'], 'Toujours à la recherche de nouveaux marchés.'],
  ['sarah', 'Sarah Cohen', 'Data analyst', RD, ['SQL', 'Power BI'], 'Les chiffres racontent des histoires.'],
  ['clara', 'Clara Dupuis', 'Chargée de marketing', SALES, ['Marketing', 'SEO'], 'Contenus, référencement et campagnes.'],
  ['hugo', 'Hugo Lambert', 'Développeur front-end', RD, ['React', 'CSS'], 'Animations fluides et composants réutilisables.'],
  ['mehdi', 'Mehdi Saïdi', 'Ingénieur avant-vente', SALES, ['Démo', 'Cloud'], 'Je montre aux clients ce que fait le produit.'],
  ['alice', 'Alice Robert', 'Responsable marketing', SALES, ['Marketing', 'Branding'], 'Salons, marque et communication.'],
  ['romain', 'Romain Blanc', 'Commercial sédentaire', SALES, ['Téléprospection'], 'Au téléphone toute la journée, et ça me plaît.'],
  ['eva', 'Éva Morel', 'Customer success manager', SALES, ['Relation client', 'Onboarding'], 'Des clients heureux, des clients fidèles.'],
  ['victor', 'Victor Henry', 'Juriste commercial', SALES, ['Contrats', 'RGPD'], 'Contrats, CGV et conformité.'],
  ['zoe', 'Zoé Lefèvre', 'Chargée de communication', SALES, ['Communication', 'Réseaux sociaux'], 'Blog, newsletter et réseaux sociaux.'],
  ['samuel', 'Samuel Nguyen', 'Analyste commercial', SALES, ['Excel', 'Salesforce'], 'Prévisions et reporting des ventes.'],
  ['lina', 'Lina Mansouri', 'Responsable partenariats', SALES, ['Partenariats', 'Événementiel'], 'Universités, écoles et partenaires technologiques.'],
  ['arthur', 'Arthur Simon', 'Ingénieur commercial', SALES, ['Cloud', 'Négociation'], 'Solutions cloud pour les PME.'],
  ['nora', 'Nora Benoit', 'Responsable ADV', SALES, ['ADV', 'Facturation'], 'Administration des ventes.'],
  ['gabriel', 'Gabriel Roux', 'Directeur commercial adjoint', SALES, ['Management', 'Stratégie'], 'Bras droit de Jean.'],
  ['jean', 'Jean Arnaud', 'Directeur commercial', SALES, ['Négociation', 'Management', 'CRM'], "Je dirige l'équipe commerciale. Ancien président du club de karaté."],
]

/** Index du Karate Club (0..33) -> identifiant applicatif (u01..u34). */
export const userIdOf = (index: number) => `u${String(index + 1).padStart(2, '0')}`

const now = Date.now()
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString()

export const seedUsers: User[] = PEOPLE.map(([username, display_name, job_title, department, skills, bio], i) => ({
  id: userIdOf(i),
  username,
  display_name,
  avatar_url: null,
  job_title,
  department,
  bio,
  skills,
  created_at: hoursAgo(24 * (60 - i)),
}))

// ---------------------------------------------------------------------------
// Abonnements (ce qui sera dans Neo4j : (:User)-[:FOLLOWS]->(:User))
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
// où seul le membre d'indice le plus grand suit l'autre. Résultat : des comptes ont plus
// d'abonnés que d'abonnements (les deux directeurs notamment).
export const seedFollows: [string, string][] = KARATE_EDGES.flatMap(([a, b]) => {
  const oneWay = (a * 3 + b) % 5 === 0
  return oneWay
    ? [[userIdOf(b), userIdOf(a)] as [string, string]]
    : [
        [userIdOf(a), userIdOf(b)] as [string, string],
        [userIdOf(b), userIdOf(a)] as [string, string],
      ]
})

// ---------------------------------------------------------------------------
// Publications (ce qui sera dans la collection MongoDB "posts")
// ---------------------------------------------------------------------------
// Les 4 types de documents cohabitent dans la même collection, chacun avec ses propres champs.

let postCounter = 0
const pid = () => `p${String(++postCounter).padStart(3, '0')}`

export const seedPosts: Post[] = [
  {
    id: pid(), author_id: 'u01', type: 'article', tags: ['neo4j', 'architecture'], likes_count: 24, created_at: hoursAgo(2),
    title: 'Pourquoi un graphe pour notre réseau interne ?',
    reading_time_min: 2,
    body:
      "Pour suggérer des collègues à suivre, il faut regarder les abonnements de mes abonnements, puis les leurs, etc. Dans une base relationnelle ou documentaire, chaque niveau supplémentaire ajoute une jointure (ou un $lookup) sur une table qui grossit avec le nombre d'utilisateurs.\n\n" +
      "Dans Neo4j, chaque nœud garde des références directes vers ses relations : c'est l'« index-free adjacency ». Passer d'un nœud à ses voisins ne demande aucune recherche dans un index global ; le coût dépend du nombre de relations parcourues, pas de la taille totale de la base.\n\n" +
      'Nous gardons donc Neo4j très léger (uniquement des identifiants et des relations FOLLOWS) et laissons MongoDB stocker les profils et les publications.',
  },
  {
    id: pid(), author_id: 'u34', type: 'text', tags: ['ventes', 'équipe'], likes_count: 31, created_at: hoursAgo(5),
    text: "Record battu ce trimestre 🎉 Merci à toute l'équipe commerciale, et en particulier à Amina et Gabriel pour le contrat signé hier soir.",
  },
  {
    id: pid(), author_id: 'u02', type: 'text', tags: ['mongodb', 'performance'], likes_count: 18, created_at: hoursAgo(9),
    text: "Astuce MongoDB : un index composé { author_id: 1, created_at: -1 } rend la requête du fil d'actualité très rapide, même avec des millions de posts.",
  },
  {
    id: pid(), author_id: 'u03', type: 'poll', tags: ['sondage', 'data'], likes_count: 7, created_at: hoursAgo(12),
    question: 'Quel langage de requête préférez-vous ?',
    options: [
      { label: 'Cypher', votes: 9 },
      { label: 'MQL (MongoDB)', votes: 4 },
      { label: 'SQL', votes: 6 },
      { label: 'GraphQL', votes: 3 },
    ],
  },
  {
    id: pid(), author_id: 'u24', type: 'image', tags: ['événement', 'marketing'], likes_count: 27, created_at: hoursAgo(20),
    caption: 'Notre stand au salon Data & IA de Lyon !',
    image: {
      url: '/demo/stand.svg', alt: 'Stand Neo4Link sur un salon', width: 600, height: 340,
      exif: { Appareil: 'Canon EOS R6', Objectif: '24-70 mm', ISO: '400', Lieu: 'Lyon' },
    },
  },
  {
    id: pid(), author_id: 'u04', type: 'text', tags: ['front', 'design'], likes_count: 12, created_at: hoursAgo(26),
    text: "Le nouveau design system est en ligne ✨ Tous les composants sont documentés, n'hésitez pas à me faire des retours.",
  },
  {
    id: pid(), author_id: 'u09', type: 'article', tags: ['graphes', 'data-science'], likes_count: 15, created_at: hoursAgo(30),
    title: 'Détecter des communautés avec Louvain',
    reading_time_min: 2,
    body:
      "L'algorithme de Louvain regroupe les nœuds d'un graphe en communautés en maximisant la modularité : on veut beaucoup de liens à l'intérieur des groupes et peu entre eux.\n\n" +
      "Il alterne deux phases : chaque nœud rejoint la communauté voisine qui améliore le plus la modularité, puis chaque communauté est fusionnée en un seul nœud, et on recommence.\n\n" +
      'Sur notre réseau interne, il retrouve sans surprise les deux grands services : la R&D et le commercial.',
  },
  {
    id: pid(), author_id: 'u16', type: 'text', tags: ['équipe'], likes_count: 9, created_at: hoursAgo(34),
    text: "Qui serait dispo jeudi pour un déjeuner d'équipe ? 🍕",
  },
  {
    id: pid(), author_id: 'u07', type: 'image', tags: ['devops'], likes_count: 14, created_at: hoursAgo(40),
    caption: 'Le nouveau cluster Kubernetes est en production.',
    image: {
      url: '/demo/servers.svg', alt: 'Baie de serveurs', width: 600, height: 340,
      exif: { Appareil: 'iPhone 16 Pro', Focale: '24 mm', ISO: '800' },
    },
  },
  {
    id: pid(), author_id: 'u33', type: 'poll', tags: ['séminaire'], likes_count: 6, created_at: hoursAgo(46),
    question: 'Quel format pour le séminaire de janvier ?',
    options: [
      { label: 'Présentiel à Tours', votes: 11 },
      { label: 'Hybride', votes: 7 },
      { label: '100 % en ligne', votes: 2 },
    ],
  },
  {
    id: pid(), author_id: 'u08', type: 'text', tags: ['produit', 'agile'], likes_count: 10, created_at: hoursAgo(52),
    text: 'Rétro du sprint 42 : on a livré la recherche de collègues par compétences. Prochaine étape : les recommandations de mentors.',
  },
  {
    id: pid(), author_id: 'u28', type: 'text', tags: ['communication'], likes_count: 13, created_at: hoursAgo(58),
    text: "Notre article sur la culture d'entreprise vient de sortir sur le blog. Merci à tous ceux qui ont participé aux interviews !",
  },
  {
    id: pid(), author_id: 'u14', type: 'article', tags: ['architecture', 'nosql'], likes_count: 21, created_at: hoursAgo(64),
    title: 'Persistance polyglotte : une base par besoin',
    reading_time_min: 2,
    body:
      "Plutôt que de forcer toutes les données dans un seul moteur, la persistance polyglotte choisit le meilleur outil pour chaque type de données.\n\n" +
      "Notre réseau social combine deux familles NoSQL : MongoDB (documents) pour les profils et les publications, dont la forme varie d'un post à l'autre, et Neo4j (graphe) pour les abonnements, que l'on parcourt sur plusieurs niveaux.\n\n" +
      "Le prix à payer : l'application doit garder les deux bases cohérentes. L'identifiant de l'utilisateur est la clé commune entre les deux.",
  },
  {
    id: pid(), author_id: 'u26', type: 'text', tags: ['clients'], likes_count: 17, created_at: hoursAgo(70),
    text: "Un client vient de nous dire que notre onboarding était « le plus simple qu'il ait connu ». Ça fait plaisir 😊",
  },
  {
    id: pid(), author_id: 'u11', type: 'text', tags: ['sécurité'], likes_count: 8, created_at: hoursAgo(76),
    text: "Rappel : activez la double authentification sur vos comptes. Je passe dans les bureaux cet après-midi si vous avez besoin d'aide.",
  },
  {
    id: pid(), author_id: 'u30', type: 'image', tags: ['partenariat'], likes_count: 22, created_at: hoursAgo(82),
    caption: "Signature du partenariat avec l'université de Tours.",
    image: {
      url: '/demo/handshake.svg', alt: 'Poignée de main lors de la signature', width: 600, height: 340,
      exif: { Appareil: 'Sony A7 IV', ISO: '320', Lieu: 'Tours' },
    },
  },
  {
    id: pid(), author_id: 'u13', type: 'poll', tags: ['ux'], likes_count: 5, created_at: hoursAgo(88),
    question: "Thème sombre par défaut sur l'intranet ?",
    options: [
      { label: 'Oui', votes: 14 },
      { label: 'Non', votes: 5 },
      { label: 'Selon le système', votes: 9 },
    ],
  },
  {
    id: pid(), author_id: 'u20', type: 'text', tags: ['data', 'ventes'], likes_count: 11, created_at: hoursAgo(94),
    text: 'Le tableau de bord des ventes est mis à jour en temps réel depuis ce matin 📊',
  },
  {
    id: pid(), author_id: 'u23', type: 'text', tags: ['avant-vente'], likes_count: 9, created_at: hoursAgo(100),
    text: 'Démo client réussie ce matin : la visualisation du graphe des relations a fait son effet.',
  },
  {
    id: pid(), author_id: 'u06', type: 'text', tags: ['qualité'], likes_count: 7, created_at: hoursAgo(106),
    text: "Couverture de tests à 87 % sur l'API. Objectif 90 % avant la fin du mois !",
  },
  {
    id: pid(), author_id: 'u31', type: 'article', tags: ['cloud', 'vente'], likes_count: 6, created_at: hoursAgo(112),
    title: 'Trois questions à poser avant de proposer une solution cloud',
    reading_time_min: 1,
    body:
      "1. Où sont les données aujourd'hui, et qui a le droit d'y accéder ?\n\n" +
      "2. Quel est le pic de charge réel, et à quelle fréquence arrive-t-il ?\n\n" +
      "3. Qui maintiendra la solution une fois le projet terminé ?",
  },
  {
    id: pid(), author_id: 'u05', type: 'text', tags: ['stage'], likes_count: 16, created_at: hoursAgo(118),
    text: "Premier jour terminé, merci pour l'accueil ! J'ai déjà appris ce qu'est un nœud et une relation 😄",
  },
  {
    id: pid(), author_id: 'u01', type: 'text', tags: ['équipe'], likes_count: 19, created_at: hoursAgo(120),
    text: "Bienvenue à Lucas qui rejoint l'équipe R&D en stage pour 6 mois 👋",
  },
  {
    id: pid(), author_id: 'u18', type: 'text', tags: ['python', 'mongodb'], likes_count: 4, created_at: hoursAgo(128),
    text: "Quelqu'un a déjà migré de Motor vers l'API asynchrone de PyMongo ? Retours bienvenus.",
  },
  {
    id: pid(), author_id: 'u10', type: 'text', tags: ['ventes'], likes_count: 8, created_at: hoursAgo(136),
    text: 'Trois nouveaux rendez-vous décrochés cette semaine, la prospection paie !',
  },
  {
    id: pid(), author_id: 'u22', type: 'image', tags: ['front'], likes_count: 10, created_at: hoursAgo(150),
    caption: "Avant / après de la nouvelle page d'accueil.",
    image: { url: '/demo/screens.svg', alt: "Deux maquettes de la page d'accueil", width: 600, height: 340 },
  },
  {
    id: pid(), author_id: 'u32', type: 'text', tags: ['adv'], likes_count: 3, created_at: hoursAgo(160),
    text: "Clôture mensuelle terminée. Merci à tous pour l'envoi rapide des bons de commande.",
  },
  {
    id: pid(), author_id: 'u29', type: 'poll', tags: ['outils'], likes_count: 2, created_at: hoursAgo(170),
    question: 'Quel outil pour les prévisions de ventes ?',
    options: [
      { label: 'Excel', votes: 3 },
      { label: 'Salesforce', votes: 8 },
      { label: 'Power BI', votes: 5 },
    ],
  },
  {
    id: pid(), author_id: 'u17', type: 'text', tags: ['infra'], likes_count: 5, created_at: hoursAgo(180),
    text: 'Maintenance du réseau samedi de 8 h à 12 h : le VPN sera coupé.',
  },
  {
    id: pid(), author_id: 'u15', type: 'text', tags: ['terrain'], likes_count: 6, created_at: hoursAgo(190),
    text: 'Belle journée de terrain à Orléans, deux devis signés.',
  },
  {
    id: pid(), author_id: 'u12', type: 'text', tags: ['mobile'], likes_count: 13, created_at: hoursAgo(200),
    text: "La nouvelle version de l'appli mobile est disponible sur les stores 📱",
  },
  {
    id: pid(), author_id: 'u27', type: 'text', tags: ['juridique'], likes_count: 4, created_at: hoursAgo(210),
    text: "Nouvelle version des CGV disponible sur l'intranet, à utiliser à partir de lundi.",
  },
]
