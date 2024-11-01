# See README.md for example build and run commands for this Dockerfile
FROM nixos/nix

# Install dependencies
RUN nix-channel --update
RUN nix-env -iA nixpkgs.git nixpkgs.nodejs nixpkgs.nodePackages_latest.pnpm nixpkgs.nodePackages_latest.vercel nixpkgs.nodePackages_latest.prisma nixpkgs.openssl nixpkgs.gnused nixpkgs.docker nixpkgs.sudo

# Install latest server-manager-service
RUN git clone https://github.com/Zane-T-Rice/server-manager-service.git
WORKDIR /server-manager-service
RUN npm install

COPY ./start-server-manager-service-server.sh /start-server-manager-service-server.sh
ENTRYPOINT ["bash", "/start-server-manager-service-server.sh"]
