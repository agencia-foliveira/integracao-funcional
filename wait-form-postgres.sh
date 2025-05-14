#!/bin/sh
echo "Aguardando PostgreSQL ficar pronto..."
until pg_isready -h postgres -p 5432 -U postgres; do
  sleep 2
done

echo "PostgreSQL está pronto. Iniciando worker..."
node src/processor.js
