FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY node_modules ./node_modules
COPY dist ./dist
COPY prisma ./prisma

ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/club?schema=public

CMD ["node", "dist/main.js"]
