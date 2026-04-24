import admin from "firebase-admin";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { env } from "../../config/env";

type FirebaseCredentials = {
  clientEmail?: string;
  clientId?: string;
  privateKey?: string;
  privateKeyId?: string;
  projectId?: string;
};

const localFirebaseConfigPath = path.join(process.cwd(), "src", "config", "firebase.json");

const readFirebaseJsonCredentials = (): FirebaseCredentials => {
  if (!existsSync(localFirebaseConfigPath)) {
    return {};
  }

  const rawFile = readFileSync(localFirebaseConfigPath, "utf8");
  const parsedFile = JSON.parse(rawFile) as {
    client_email?: string;
    client_id?: string;
    private_key?: string;
    private_key_id?: string;
    project_id?: string;
  };

  return {
    clientEmail: parsedFile.client_email,
    clientId: parsedFile.client_id,
    privateKey: parsedFile.private_key,
    privateKeyId: parsedFile.private_key_id,
    projectId: parsedFile.project_id,
  };
};

const envFirebaseCredentials: FirebaseCredentials = {
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
  clientId: env.FIREBASE_CLIENT_ID,
  privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  privateKeyId: env.FIREBASE_PRIVATE_KEY_ID,
  projectId: env.FIREBASE_PROJECT_ID,
};

const jsonFirebaseCredentials = readFirebaseJsonCredentials();

const firebaseCredentials: FirebaseCredentials = {
  clientEmail: envFirebaseCredentials.clientEmail || jsonFirebaseCredentials.clientEmail,
  clientId: envFirebaseCredentials.clientId || jsonFirebaseCredentials.clientId,
  privateKey: envFirebaseCredentials.privateKey || jsonFirebaseCredentials.privateKey,
  privateKeyId:
    envFirebaseCredentials.privateKeyId || jsonFirebaseCredentials.privateKeyId,
  projectId: envFirebaseCredentials.projectId || jsonFirebaseCredentials.projectId,
};

export const isFirebaseConfigured = Boolean(
  firebaseCredentials.projectId &&
    firebaseCredentials.clientEmail &&
    firebaseCredentials.privateKey,
);

export const getFirebaseAdmin = () => {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase credentials are missing. Set FIREBASE_* values in backend/.env or add src/config/firebase.json locally.",
    );
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        clientEmail: firebaseCredentials.clientEmail,
        privateKey: firebaseCredentials.privateKey,
        projectId: firebaseCredentials.projectId,
      }),
    });
  }

  return admin;
};
