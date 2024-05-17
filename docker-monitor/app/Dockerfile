FROM node:20

# Set the working directory
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the index.js file
COPY index.js .

# Expose the port the app runs on
EXPOSE 8080

# Set the command to execute the index.js file
CMD ["node", "index.js"]
