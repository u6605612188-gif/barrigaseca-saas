import admin from "firebase-admin";

function parseServiceAccount(json: string) {
  try {
    return JSON.parse(json);
  } catch {
    const fixed = json.replace(
      /"private_key"\s*:\s*"([\s\S]*?)"\s*,\s*"client_email"/,
      (_match, privateKey: string) => {
        const escapedKey = privateKey
          .replace(/\r/g, "")
          .replace(/\n/g, "\\n")
          .replace(/\t/g, "\\t");
        return `"private_key":"${escapedKey}","client_email"`;
      }
    );

    return JSON.parse(fixed);
  }
}

export function getAdminApp() {
  if (!admin.apps.length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (!json) {
      throw new Error("ENV ausente: FIREBASE_SERVICE_ACCOUNT_JSON");
    }

    admin.initializeApp({
      credential: admin.credential.cert(parseServiceAccount(json)),
    });
  }

  return admin.app();
}

export function getAdminDb() {
  return getAdminApp().firestore();
}
