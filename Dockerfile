FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
ENV NODE_ENV=production PORT=10000
EXPOSE 10000
# Render injects PORT; fall back to 10000 so the service still starts locally.
CMD ["sh", "-c", "npm start"]
