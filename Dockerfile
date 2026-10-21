# ---------- build stage ----------
FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=development
COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# ---------- runtime stage ----------
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/build ./build
COPY public ./public
COPY app ./app
COPY shopify.app.toml ./
EXPOSE 3000
CMD ["npm", "run", "docker-start"]
