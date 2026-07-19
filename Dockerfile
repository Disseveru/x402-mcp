FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN node node_modules/typescript/bin/tsc
EXPOSE 4020
CMD ["node", "dist/mcp/server.js"]

