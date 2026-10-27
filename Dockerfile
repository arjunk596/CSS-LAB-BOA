FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
# levelRegistry.js resolves "../levels/levels.yaml" relative to /app → /levels/
COPY levels/ /levels/
EXPOSE 4000
CMD ["node", "src/server.js"]
