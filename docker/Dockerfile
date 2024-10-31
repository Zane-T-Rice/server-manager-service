FROM nixos/nix

# This is the suffix of whichever file in environments/ that you want to use.
# Override ENV for deployments to non-local environments with --build-arg ENV=suffix.
ENV ENV=local
ARG ENV

# Install dependencies
RUN nix-channel --update
RUN nix-env -iA nixpkgs.git nixpkgs.nodejs nixpkgs.nodePackages_latest.pnpm nixpkgs.nodePackages_latest.vercel nixpkgs.nodePackages_latest.prisma nixpkgs.openssl nixpkgs.gnused nixpkgs.docker

# Install latest server-manager-service
RUN git clone https://github.com/Zane-T-Rice/server-manager-service.git
WORKDIR /server-manager-service
RUN cp environments/.env.$ENV .env
RUN npm install

EXPOSE 3000/udp
EXPOSE 3000/tcp

COPY ./start-server-manager-service-server.sh /start-server-manager-service-server.sh
ENTRYPOINT ["bash", "/start-server-manager-service-server.sh"]
