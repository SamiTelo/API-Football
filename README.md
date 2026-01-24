Backend API – NestJS + Prisma + Auth + CRUD Football club
(Ce projet est un prototype d’API en cours de développement. La logique métier principale est fonctionnelle.)

API backend complète construite avec NestJS, Prisma, PostgreSQL, sécurisée avec JWT, Refresh Tokens, Roles & Permissions, et comprenant des modules métier (Players, Teams, Positions).
Inclut également du monitoring (Prometheus + Grafana) et du tracking d’erreurs (Sentry).

Statut : Travail en cours (WIP)

Objectif : L’objectif de ce projet est de développer une API backend complète dédiée à la gestion du football, permettant d’administrer des joueurs, des équipes et des postes, tout en s’appuyant sur une architecture moderne et sécurisée.
Ce projet, bien qu’étant une initiative personnelle, est rendu public pour :
- partager une architecture propre et réutilisable,
- servir de référence ou d’inspiration à d’autres développeurs,
- et continuer à évoluer autour d’un thème passionnant : le football.

##  Fonctionnalités
- Inscription & connexion sécurisées (JWT + Refresh Token)
- Réinitialisation de mot de passe
- Gestion des rôles (USER, ADMIN, SUPERADMIN)
- Protection des routes (Guards & Decorators)
- Guards d’autorisation (JwtAuthGuard, RolesGuard)
- Permissions associées aux rôles
- Tentatives d’inscription enregistrées (SignupAttempt)
- Rate limiting (anti brute-force)
- Monitoring Prometheus + Grafana
- Logs structurés (Winston)
- Sentry (errors & performance)

##  Fonctionnalités à venir (feature)
- Validation d’email
- Upload de fichiers (images de joueurs, logos d’équipes, documents…)
- Optimisation des performances
- Ajout de nouveaux modules métier
- Interface d’administration (peut-être plus tard)
- etc...

##  Stack
- **NestJS**
- **Prisma ORM**
- **JWT**
- **PostgreSQL**
- **Swagger**
- **Sentry**
- **Prometheus / Grafana**
  

##  Modules métier – CRUD complet

Players
- CRUD complet des joueurs
- Association à un poste (Position)
- Association à une équipe (Team)

Teams
- Création & gestion des équipes
- Relation avec les joueurs

Positions
- Gestion des postes (nom unique)
- Association automatique avec les joueurs


## Prisma – Modèles utilisés
- User
- Role
- Permission
- SignupAttempt
- Player
- Team
- Position

## Démarrage
```bash
git clone https://github.com/<ton-user>/<ton-repo>.git
cd <ton-repo>
npm install
npm run start:dev
```

##  Scripts utiles
```bash
npm run migrate       # Migration Prisma
npm run studio        # Prisma Studio
npm run build
```

##  Variables d’environnement (.env)
```
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
MAIL_USER=
MAIL_PASS=
SENTRY_DSN=
```

##  Documentation
Une documentation Swagger est disponible :
```
http://localhost:3000/api
```

##  Auteur
**Samuel tiemtore**
samueltiemtore10@gmail.com

