# Smart School ERP Backend

Production backend for Smart School ERP.

## Stack

- Node.js
- Express
- TypeScript
- MongoDB
- Firebase Admin
- Socket.IO

## Scripts

```bash
npm install
npm run dev
npm run start
npm run typecheck
```

## Environment

Start from `.env.example` and configure:

- `MONGO_URI` or `MONGODB_URI`
- `JWT_SECRET`
- `REFRESH_JWT_SECRET`
- `CLIENT_URLS`
- `WEB_APP_URL`

## Health Check

```text
GET /health
```

Expected response:

```json
{"ok":true}
```
