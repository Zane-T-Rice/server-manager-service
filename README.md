# server-manager-service

Provides server information and management functions such as stop, start, restart.

### How to Get This Running

The first time you start this you will need to copy .env.default over to .env.

```sh
cp .env.default .env
```

The service can be setup and started like this.

```sh
npm install
npx prisma migrate dev --name init
npm run start
```

### Manual Testing

To make trying the service out easier I have provided an insomnia.json. You can try the service out with the [Insomnia](https://insomnia.rest/) tool by importing the insomnia/insomnia.json file in to your insomnia scratchpad. There is no need to make an account to do this.
