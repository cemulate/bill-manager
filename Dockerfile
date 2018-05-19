FROM node:10

COPY . /app

WORKDIR /app

RUN yarn install && \
    npm run build

ENV NODE_ENV=production

ENTRYPOINT npm run $NODE_ENV