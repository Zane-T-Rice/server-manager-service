FROM nixos/nix

RUN nix-channel --update
RUN nix-env -i git nodejs nodePackages_latest.pnpm nodePackages_latest.vercel nodePackages_latest.prisma openssl
VOLUME /path/to/server-manager-service:/server-manager-service
WORKDIR /server-manager-service
RUN cp .env.default .env
RUN npm install
RUN npx prisma migrate dev --name init

EXPOSE 3000/udp
EXPOSE 3000/tcp

COPY ./start-server-manager-service-server.sh /start-server-manager-service-server.sh
ENTRYPOINT ["bash", "/start-server-manager-service-server.sh"]
