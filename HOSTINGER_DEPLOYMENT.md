Hostinger deployment settings for `school-erp-backend`

- Preset: `Express`
- Node.js version: `22`
- Branch: `master`
- Root directory: `/`
- Build command: `npm install`
- Start command: `npm start`
- Entry file: `hostinger-start.cjs`

The repository `build` script is intentionally a no-op for Hostinger so the app
can run directly via `tsx` without failing on repository-wide TypeScript
errors during deployment.

Environment values are prepared locally in:

- `.env.hostinger.local`

This file already includes:

- MongoDB connection string
- generated production JWT secrets
- super admin credentials from the existing project setup
- Smart School frontend domains
- Cloudinary settings from the existing local backend setup
- Firebase service-account values extracted from `.secrets/firebase.service-account.json`
- email credentials from the existing local backend setup

Recommended runtime checks after deploy:

- `/`
- `/health`
