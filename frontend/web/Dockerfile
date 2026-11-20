FROM node:20-alpine

WORKDIR /app

# Copy package definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy web source code
COPY . .

# Build Next.js application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
