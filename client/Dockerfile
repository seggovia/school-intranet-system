FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json

RUN npm ci --workspace client --include-workspace-root

COPY client ./client

EXPOSE 5173
