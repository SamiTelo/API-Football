# =========================
# Étape 1 : Builder (Node pour build)
# =========================
FROM node:20-alpine AS builder

# Installer openssl pour Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copier package.json et package-lock.json pour installer deps
COPY package*.json ./
RUN npm install

# Copier le reste des fichiers
COPY . .

# Générer Prisma Client
RUN npx prisma generate

# Build NestJS
RUN npm run build

# =========================
# Étape 2 : Image finale
# =========================
FROM node:20-alpine

# Installer openssl pour Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copier node_modules, dist et Prisma depuis builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Définir la variable d'environnement pour Docker (à adapter si besoin)
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/club?schema=public

# Lancer l'app
CMD ["node", "dist/main.js"]
