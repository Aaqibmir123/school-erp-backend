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

let firebaseConfigError: string | null = null;

const resolveServiceAccountPath = () => {
  if (!env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return null;
  }

  return path.isAbsolute(env.FIREBASE_SERVICE_ACCOUNT_PATH)
    ? env.FIREBASE_SERVICE_ACCOUNT_PATH
    : path.join(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH);
};

const localFirebaseConfigPath = resolveServiceAccountPath();

const readFirebaseJsonCredentials = (): FirebaseCredentials => {
  if (!localFirebaseConfigPath || !existsSync(localFirebaseConfigPath)) {
    return {};
  }

  try {
    const rawFile = readFileSync(localFirebaseConfigPath, "utf8").trim();

    if (!rawFile) {
      firebaseConfigError = `Firebase service account file is empty at ${localFirebaseConfigPath}.`;
      return {};
    }

    const parsedFile = JSON.parse(rawFile) as {
      client_email?: string;
      client_id?: string;
      private_key?: string;
      private_key_id?: string;
      project_id?: string;
    };

    firebaseConfigError = null;

    return {
      clientEmail: parsedFile.client_email,
      clientId: parsedFile.client_id,
      privateKey: parsedFile.private_key,
      privateKeyId: parsedFile.private_key_id,
      projectId: parsedFile.project_id,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    firebaseConfigError = `Firebase service account file at ${localFirebaseConfigPath} is invalid: ${reason}`;
    return {};
  }
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
      firebaseConfigError ||
        "Firebase credentials are missing. Set FIREBASE_* values in backend/.env or provide FIREBASE_SERVICE_ACCOUNT_PATH locally.",
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
