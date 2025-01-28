FROM node:18

WORKDIR /usr/src/app

# Install MongoDB Shell
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg] http://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list \
    && apt-get update \
    && apt-get install -y mongodb-mongosh

COPY package*.json ./
RUN npm ci
    
COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]