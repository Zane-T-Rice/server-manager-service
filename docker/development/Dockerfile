# This Dockerfile is for development only. It is very different than the
# Dockerfile for deployment found in docker/deployment/Dockerfile because it
# needs to include your local changes as well as generate any new migrations
# within your repository for committing later.
#
# See README.md for example build and run commands for this Dockerfile
FROM alpine

# Install dependencies
RUN apk add --no-cache bash git npm openssl docker zlib libgcc glib

# Install latest server-manager-service
RUN git clone https://github.com/Zane-T-Rice/server-manager-service.git

# These rm/copy lines are to get any local changes that are relevant during build and run time
RUN rm -rf /server-manager-service/src
RUN rm -rf /server-manager-service/test
RUN rm -rf /server-manager-service/prisma
RUN rm -rf /server-manager-service/swagger
RUN rm -rf /server-manager-service/babel.config.js
RUN rm -rf /server-manager-service/eslint.config.mjs
RUN rm -rf /server-manager-service/package-lock.json
RUN rm -rf /server-manager-service/package.json
RUN rm -rf /server-manager-service/tsconfig.json
COPY src /server-manager-service/src
COPY test /server-manager-service/test
COPY prisma /server-manager-service/prisma
COPY swagger /server-manager-service/swagger
COPY babel.config.js /server-manager-service/babel.config.js
COPY eslint.config.mjs /server-manager-service/eslint.config.mjs
COPY package-lock.json /server-manager-service/package-lock.json
COPY package.json /server-manager-service/package.json
COPY tsconfig.json /server-manager-service/tsconfig.json

WORKDIR /server-manager-service
RUN npm install
RUN npx prisma generate
RUN npm run build

COPY ./start-server-manager-service-server.sh /start-server-manager-service-server.sh
ENTRYPOINT ["bash", "/start-server-manager-service-server.sh"]
