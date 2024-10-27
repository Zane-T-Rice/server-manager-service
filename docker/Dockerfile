FROM nixos/nix

RUN nix-channel --update
RUN nix-env -iA nixpkgs.git nixpkgs.nodejs nixpkgs.nodePackages_latest.pnpm nixpkgs.nodePackages_latest.vercel nixpkgs.nodePackages_latest.prisma nixpkgs.openssl

EXPOSE 3000/udp
EXPOSE 3000/tcp

COPY ./start-server-manager-service-server.sh /start-server-manager-service-server.sh
ENTRYPOINT ["bash", "/start-server-manager-service-server.sh"]
