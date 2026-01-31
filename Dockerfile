# =========================
# Étape 1 : Node pour build
# =========================
FROM node:20-alpine AS builder

# Installer openssl pour Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copier les fichiers package pour installer deps
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers
COPY . .

# Générer le client Prisma AVANT le build NestJS
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

# Lancer l'app
CMD ["node", "dist/main.js"]
