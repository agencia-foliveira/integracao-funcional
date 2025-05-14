FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache postgresql-client

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=$PORT

EXPOSE ${PORT}
CMD ["npm", "start"]
