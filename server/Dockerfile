FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY server/prisma ./server/prisma

RUN npm ci --workspace server --include-workspace-root

COPY server ./server

EXPOSE 4000
