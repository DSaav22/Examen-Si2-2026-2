#!/bin/sh
set -e
cd /home/site/wwwroot
npx prisma migrate deploy
if [ "$RUN_DEMO_SEED" = "true" ] && [ ! -f /home/site/ensayar-seeded ]; then
  npx prisma db seed
  touch /home/site/ensayar-seeded
  touch /home/site/ensayar-catalogo-demo
fi
if [ "$RUN_DEMO_SEED" = "true" ] && [ ! -f /home/site/ensayar-catalogo-demo ]; then
  npm run demo:catalog
  touch /home/site/ensayar-catalogo-demo
fi
exec node dist/src/main.js
