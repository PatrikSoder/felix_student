# Bygg-steg
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Serverings-steg
FROM nginx:alpine
# Kopiera in vår egen nginx.conf om vi vill ha specifik routing (ex. React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
