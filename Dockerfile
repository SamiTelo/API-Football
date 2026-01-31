# Étape 1 : Builder
FROM node:20 AS builder

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer dépendances
RUN npm install

# Copier le reste du code
COPY . .

# Générer Prisma Client
RUN npx prisma generate

# Build NestJS
RUN npm run build

# =========================
# Étape 2 : Image finale
FROM node:20

WORKDIR /app

# Copier node_modules, dist et prisma depuis le builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Pas de COPY .env, on passera via docker-compose
# CMD pour lancer NestJS
CMD ["node", "dist/main.js"]
