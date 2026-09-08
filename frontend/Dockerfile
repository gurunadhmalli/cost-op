# Multi-stage build: compile the Vite app, then serve the static output
# through nginx, which also reverse-proxies /api and /ws to the backend
# container — the same job vite.config.ts's dev proxy does locally.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
