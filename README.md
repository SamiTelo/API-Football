## Backend API – NestJS + Prisma + Auth + CRUD Football club

API backend complète construite avec NestJS, Prisma, PostgreSQL, sécurisée avec JWT, Refresh Tokens, Roles & Permissions, et comprenant des modules métier (Players, Teams, Positions).
Inclut également du monitoring (Prometheus + Grafana) et du tracking d’erreurs (Sentry).

**NB :** 
- (Ce projet est un prototype d’API en cours de développement. La logique métier principale est fonctionnelle.)
- Ce depot est une version migrée du projet original initialiser en Octobre 2025. Le dépot a été reinitialisé pour des raisons de sécurité (nettoyage de l'historique des secrets et clés API).


**Statut** : Travail en cours (WIP)

**Objectif** : L’objectif de ce projet est de développer une API backend complète dédiée à la gestion du football, permettant d’administrer des joueurs, des équipes et des postes etc.., tout en s’appuyant sur une architecture moderne et sécurisée.
Ce projet, bien qu’étant une initiative personnelle, est rendu public pour :
- partager une architecture propre et réutilisable,
- servir de référence ou d’inspiration à d’autres développeurs,
- et continuer à évoluer autour d’un thème passionnant : le football.

## Workflow & Collaboration assistée par IA

Ce projet a été développé en utilisant une approche assistée par IA (GPT-5) pour maximiser l'efficacité tout en garantissant la qualité du code.

- **Architecture & Conception** : La base de données et la structure du projet ont été conçues manuellement pour répondre aux besoins métiers.
- **Développement & Refactoring** : L'IA a été utilisée pour générer le boilerplate, proposer des optimisations et refactorer le code. Toutes les modifications ont été vérifiées et adaptées manuellement.
- **Tests & Qualité** : Création de tests unitaires et revue de code systématique pour garantir la sécurité, la maintenabilité et la performance de l'application.
- **Décision finale** : Toutes les décisions techniques et les choix d’implémentation ont été effectués par le développeur (moi), l’IA agissant uniquement comme assistant.


##  Fonctionnalités
- Inscription & connexion sécurisées (JWT + Refresh Token)
- Verification par mail (USER)
- Verification 2FA (ADMIN & SUPERADMIN)
- Réinitialisation de mot de passe
- Gestion des rôles (USER, ADMIN, SUPERADMIN) RBAC
- Protection des routes (Guards & Decorators)
- Guards d’autorisation (JwtAuthGuard, RolesGuard)
- Permissions associées aux rôles
- Tentatives d’inscription enregistrées (SignupAttempt)
- Rate limiting (anti brute-force)
- Monitoring Prometheus + Grafana
- Logs structurés (Winston)
- Sentry (errors & performance)
- Gestions des joueur, equipe, poste etc..
- Docker
- CI/CD
- Github Action

##  Fonctionnalités à venir (feature)
- Upload de fichiers (images de joueurs, logos d’équipes, documents…)
- Optimisation des performances (caching)
- Ajout et mise en place de nouveaux modules métier
- etc...

##  Stack
- **NestJS**
- **NodeJS**
- **TypeScript**
- **Prisma ORM**
- **JWT**
- **PostgreSQL**
- **Swagger**
- **Docker**
- **Test unitaire jest**
- **Test E2E supertest**
- **Winston**
- **Sentry**
- **Prometheus / Grafana**
- **Throtller**
- **Gmail service mail ou sendGrid**
  

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


##  Variables d’environnement (.env)
```
# =========================
# Database
# =========================
DATABASE_URL=

# =========================
# JWT - ACCESS TOKEN
# =========================
JWT_SECRET=
JWT_EXPIRATION=3600              # 1 heure (en secondes)

# =========================
# JWT - REFRESH TOKEN
# =========================
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRATION=86400     # 24h (en secondes)

# =========================
# JWT - RESET PASSWORD
# =========================
JWT_RESET_SECRET=
JWT_RESET_EXPIRATION=900         # 15 minutes (en secondes)

# =========================
# JWT - EMAIL VERIFICATION
# =========================
JWT_VERIFY_SECRET=
JWT_VERIFY_EXPIRATION=86400      # 24h (en secondes)

# =========================
# Email (Gmail SMTP)
# =========================
MAIL_FROM=
GMAIL_USER=
GMAIL_APP_PASSWORD=

# ------------------------------
# SUPERADMIN
# ------------------------------
SUPERADMIN_EMAIL=
SUPERADMIN_PASSWORD=

# =========================
# Frontend
# =========================
FRONTEND_URL=

# =========================
# Sentry
# =========================
SENTRY_DSN=

# =========================
# Throttler
# =========================
THROTTLE_TTL=
THROTTLE_LIMIT=

# =========================
# Application
# =========================
NODE_ENV=
PORT=

```
## Démarrage
```bash
git clone https://github.com/SamiTelo/API-Football
cd  API-Football
npm install
npm run start:dev
```

##  Scripts utiles
```bash
npm run migrate       # Migration Prisma
npm run studio        # Prisma Studio
npm run build
```

##  Documentation
Une documentation Swagger est disponible :
```
http://localhost:3001/api
```

##  Auteur
**Samuel tiemtore**
samueltiemtore10@gmail.com

