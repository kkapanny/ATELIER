FROM node:20-alpine

WORKDIR /app

# Зависимости
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Prisma + код
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 4000

CMD ["node", "src/index.js"]
