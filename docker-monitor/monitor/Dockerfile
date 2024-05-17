FROM node:20

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the monitoring script files
COPY . .

# Set the command to run the monitor script
CMD ["npm", "start"]
