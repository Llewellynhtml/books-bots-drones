import * as admin from "firebase-admin";

const getServiceAccount = () => {
  const serviceAccountJson = process.env.APP_FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    const parsedServiceAccount = JSON.parse(serviceAccountJson);

    if (typeof parsedServiceAccount.private_key === "string") {
      parsedServiceAccount.private_key =
        parsedServiceAccount.private_key.replace(/\\n/g, "\n");
    }

    return parsedServiceAccount;
  }

  const projectId = process.env.APP_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.APP_FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.APP_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    };
  }

  return null;
};

const serviceAccount = getServiceAccount();

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
      storageBucket: process.env.APP_STORAGE_BUCKET,
    });
  } else {
    admin.initializeApp({
      projectId:
        process.env.APP_FIREBASE_PROJECT_ID ||
        process.env.GCLOUD_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT,
      storageBucket: process.env.APP_STORAGE_BUCKET,
    });
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
