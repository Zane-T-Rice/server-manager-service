# See README.md for example build and run commands for this Dockerfile
FROM alpine

# Install dependencies
RUN apk add --no-cache bash git npm openssl docker zlib libgcc glib

# Install latest server-manager-service
RUN git clone https://github.com/Zane-T-Rice/server-manager-service.git
WORKDIR /server-manager-service
RUN npm install
RUN npx prisma generate
RUN npm run build

COPY ./start-server-manager-service-server.sh /start-server-manager-service-server.sh
ENTRYPOINT ["bash", "/start-server-manager-service-server.sh"]
