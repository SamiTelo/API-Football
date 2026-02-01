# =========================
#  STAGE BUILD
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# Dépendances système (Prisma)
RUN apk add --no-cache openssl

# Copie les fichiers npm
COPY package*.json ./

# Installe dépendances
RUN npm install

# Copie le reste du projet
COPY . .

# Génére Prisma
RUN npx prisma generate

# Build NestJS → crée dist/
RUN npm run build

# =========================
#  STAGE PROD
# =========================
FROM node:20-alpine

WORKDIR /app

# Neccessaire pour le healthcheck Docker
RUN apk add --no-cache openssl curl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Port exposé
EXPOSE 3002

# Démarrage
CMD ["node", "dist/src/main.js"]

