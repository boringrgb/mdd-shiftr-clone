FROM node:20 AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY tsconfig.json ./
COPY vite.config.js ./

COPY src/common ./src/common
COPY src/client ./src/client

ARG VITE_CLIENT_MQTT_CONNECTION_STRING
ARG VITE_CLIENT_HTTP_CONNECTIONS

ENV VITE_CLIENT_MQTT_CONNECTION_STRING=$VITE_CLIENT_MQTT_CONNECTION_STRING
ENV VITE_CLIENT_HTTP_CONNECTIONS=$VITE_CLIENT_HTTP_CONNECTIONS

# Build the client
RUN npm run build:client

# Only the built files, meant to be exported to the host with: docker build --target export --output type=local,dest=<dir>
FROM scratch AS export
COPY --from=build /usr/src/app/src/client/dist /
