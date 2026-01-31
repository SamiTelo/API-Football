# =========================
#  STAGE BUILD
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# Dépendances système (Prisma)
RUN apk add --no-cache openssl

# Copier les fichiers npm
COPY package*.json ./

# Installer dépendances
RUN npm install

# Copier le reste du projet
COPY . .

# Générer Prisma
RUN npx prisma generate

# Build NestJS → crée dist/
RUN npm run build

# =========================
#  STAGE PROD
# =========================
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

# Copier seulement ce qui est nécessaire
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Port exposé
EXPOSE 3002

# Démarrage
CMD ["node", "dist/src/main.js"]

