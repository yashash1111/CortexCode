FROM node:20-alpine

# Install OpenSSL and compatibility libraries for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and Prisma schema
COPY . .

# Generate Prisma client and build TypeScript
RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
