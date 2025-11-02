{ pkgs ? import (builtins.fetchTarball {
        url = "https://github.com/NixOS/nixpkgs/archive/59133ee770406f605d61698bc4f1a89efcf461d5.tar.gz";
    }) {} }:
pkgs.mkShellNoCC {
 PRISMA_QUERY_ENGINE_LIBRARY = "${pkgs.prisma-engines}/lib/libquery_engine.node";
 PRISMA_QUERY_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/query-engine";
 PRISMA_SCHEMA_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/schema-engine";
}
