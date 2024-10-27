#!/usr/bin/env bash
PRISMA_ENGINES_DIR=$(nix eval nixpkgs#prisma-engines.outPath --extra-experimental-features nix-command --extra-experimental-features flakes  | sed 's/^.//' | sed 's/.$//')
export PRISMA_QUERY_ENGINE_LIBRARY="$PRISMA_ENGINES_DIR/lib/libquery_engine.node";
export PRISMA_QUERY_ENGINE_BINARY="$PRISMA_ENGINES_DIR/bin/query-engine";
export PRISMA_SCHEMA_ENGINE_BINARY="$PRISMA_ENGINES_DIR/bin/schema-engine";

cd /server-manager-service
if [ ! -f .env ]; then cp .env.default .env; fi
npm install
npx prisma migrate dev --name init
npm run start
