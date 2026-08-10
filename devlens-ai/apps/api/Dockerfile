FROM node:20-alpine

WORKDIR /app

# Copy monorepo package definition files
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm ci

# Copy API source code and packages
COPY packages ./packages
COPY apps/api ./apps/api

WORKDIR /app/apps/api

# Generate Prisma Client & compile TypeScript
RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
