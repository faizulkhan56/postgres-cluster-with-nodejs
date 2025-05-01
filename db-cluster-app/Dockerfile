# Use official Node.js image as a base
FROM node:18

# Set working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project
COPY . .

# Expose the application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Command to start the application
CMD ["npm", "start"]
