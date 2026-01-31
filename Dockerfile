# Étape 1 : Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Copier les variables Docker pour Prisma
COPY .env.docker .env
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/club?schema=public

RUN npx prisma generate
RUN npm run build

# Étape 2 : Image finale
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

CMD ["node", "dist/main.js"]
