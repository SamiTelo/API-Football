# =========================
# Builder
# =========================
FROM node:24-alpine AS builder

# Créer le dossier de travail
WORKDIR /app

# Copier package.json et lockfile
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code
COPY . .

# Générer le client Prisma (IMPORTANT pour TS)
RUN npx prisma generate

# Générer le build de production
RUN npm run build

# =========================
# Image finale légère
# =========================
FROM node:24-alpine

WORKDIR /app

# Copier uniquement les fichiers nécessaires depuis le builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Définir le port exposé
ENV PORT=3001
EXPOSE $PORT

# Commande pour lancer l'application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
