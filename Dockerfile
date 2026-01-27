# construire l'app
FROM node:24-alpine AS builder

# Créer le dossier de travail
WORKDIR /app

# Copier package.json et lockfile
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code
COPY . .

# Générer le build de production
RUN npm run build

# image finale légère
FROM node:24-alpine

WORKDIR /app

# Copier seulement les fichiers nécessaires depuis le builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

# Exposer le port
EXPOSE 3001

# Définir la commande de lancement
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
