FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Expose port 5177
EXPOSE 5177

# Start Vite dev server on port 5177
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5177"]
