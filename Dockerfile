# Base image
FROM node:16-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies for running tests)
RUN npm ci || npm install

# Copy project files
COPY . .

# Expose port
EXPOSE 8080

# Start command
CMD ["node", "app.js"]
