# Use official Node 20 base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy dependency files first to utilize Docker layer caching
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies for root, client, and server
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Copy the rest of the application files
COPY . .

# Build the frontend client React application
RUN cd client && npm run build

# Expose port 4000
EXPOSE 4000

# Define database storage path for persistence
ENV DB_PATH=/app/data/northridge_nets.db
ENV NODE_ENV=production

# Run the backend server
CMD ["node", "server/index.js"]
