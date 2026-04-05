# force rebuild
#!/bin/sh
set -e

echo "⏳ Running database migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}' npx ts-node prisma/seed.ts

echo "🚀 Starting server..."
node dist/main.js
