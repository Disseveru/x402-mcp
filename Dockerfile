FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN chmod -R +x node_modules/.bin || true
COPY . .
RUN npm run build
EXPOSE 4020
CMD ["node", "dist/mcp/server.js"]
