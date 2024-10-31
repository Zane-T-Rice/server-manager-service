#!/usr/bin/env bash

# Migrate database to make sure it is in sync with latest schema.
PRISMA_ENGINES_DIR=$(nix eval nixpkgs#prisma-engines.outPath --extra-experimental-features nix-command --extra-experimental-features flakes  | sed 's/^.//' | sed 's/.$//')
export PRISMA_QUERY_ENGINE_LIBRARY="$PRISMA_ENGINES_DIR/lib/libquery_engine.node"
export PRISMA_QUERY_ENGINE_BINARY="$PRISMA_ENGINES_DIR/bin/query-engine"
export PRISMA_SCHEMA_ENGINE_BINARY="$PRISMA_ENGINES_DIR/bin/schema-engine"
npx prisma migrate deploy

# Start server-manager-service
npm run start
