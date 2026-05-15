# V2-QAR
Asset Registry website for QEDi - test model v2

## Firebase Setup
1. Open the Firebase console: https://console.firebase.google.com/
2. Create a new project or select the existing `qedi-asset-register` project.
3. In the project settings, add a new Web app and copy the Firebase config.
4. This project already includes the required Firebase config in `firebase-init.js`.
5. Enable Firestore in the Firebase console and create two collections:
   - `assets`
   - `maintenanceLogs`
6. Optionally enable Email/Password authentication under Authentication → Sign-in methods.
7. Create an admin user with the email `operations@qedi-ng.com` and a secure password.

## Firestore Security Rules
Use the following Firestore rules as a starting point. These rules allow authenticated admin users to read/write asset and maintenance records, and allow unauthenticated guests to read only.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /assets/{assetId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }
    match /maintenanceLogs/{logId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }
  }
}
```

> Note: This project currently falls back to a local demo login when Firebase Auth is unavailable, but the recommended approach is to use Firebase Auth with a real admin account for production.
