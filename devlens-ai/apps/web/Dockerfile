FROM node:20-alpine

WORKDIR /app

# Copy monorepo package definition files
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy web app source code and packages
COPY packages ./packages
COPY apps/web ./apps/web

WORKDIR /app/apps/web

# Build Next.js application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
