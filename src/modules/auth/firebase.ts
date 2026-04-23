import admin from "firebase-admin";
import { env } from "../../config/env";

// WHY: Firebase admin credentials must stay out of the repository so the
// project can pass secret scanning and be safely deployed from git history.
const firebaseCredentials = {
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
  clientId: env.FIREBASE_CLIENT_ID,
  privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  privateKeyId: env.FIREBASE_PRIVATE_KEY_ID,
  projectId: env.FIREBASE_PROJECT_ID,
};

if (!admin.apps.length) {
  if (!firebaseCredentials.projectId || !firebaseCredentials.clientEmail || !firebaseCredentials.privateKey) {
    throw new Error(
      "Firebase credentials are missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in backend/.env",
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      client_email: firebaseCredentials.clientEmail,
      client_id: firebaseCredentials.clientId || undefined,
      private_key: firebaseCredentials.privateKey,
      private_key_id: firebaseCredentials.privateKeyId || undefined,
      project_id: firebaseCredentials.projectId,
      type: "service_account",
    }),
  });
}

export default admin;
