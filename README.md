# server-manager-service

Provides server information and management functions such as stop, start, restart.

### How to Get This Running

The first time you start this you will need to do all of the following.

```sh
  echo "PORT=3000" > .env
  echo "DATABASE_URL="file:./dev.db"" >> .env
  npm install
  npx prisma migrate dev --name init
  npm run start
```

After the first time you should only use

```sh
  npm install
  npx prisma migrate dev --name init
  npm run start
```
