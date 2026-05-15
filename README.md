# V2-QAR
Asset Registry website for QEDi - test model v2

## 🎯 Key Features

- **Real-time Data Sync**: All changes made by admins are instantly synced to all connected clients (guests, QR scans, other admins)
- **Firebase Authentication**: Secure admin login with email/password
- **Role-based Access Control**: Only authenticated admins can create, edit, or delete assets and maintenance logs
- **Maintenance Tracking**: Track completed and scheduled maintenance for each asset
- **QR Code Generation**: Generate and scan QR codes to view asset details
- **Guest View**: Allow read-only access to asset registry without authentication

## 🔄 Real-Time Synchronization

The app uses **Firestore real-time listeners** (`onSnapshot`) to keep all connected clients synchronized:

1. **Admin Creates/Updates Asset** → Written to Firestore
2. **Firestore Listener Triggers** → All connected clients receive update
3. **UI Automatically Refreshes** → Guests & QR scans show new data instantly

This ensures that:
- Guests always see the latest asset data
- QR code scans reflect current asset status
- Multiple users viewing the same asset see consistent information
- No manual refresh needed to see admin changes

## 🔐 Firebase Setup

### 1. Enable Firestore and Authentication

In your Firebase Console:
1. Go to **Firestore Database** → Create Database (Start in production mode)
2. Go to **Authentication** → Enable Email/Password sign-in method
3. Create an admin user with email `operations@qedi-ng.com`

### 2. Create Collections

In Firestore, create two collections:
- **`assets`** — Stores asset records
- **`maintenanceLogs`** — Stores maintenance history

### 3. Set Admin Custom Claim

Only users with the admin custom claim can modify data. Use Firebase CLI to set it:

```bash
firebase auth:set-custom-claims operations@qedi-ng.com --admin
```

Or use the [Backend Server](BACKEND_SETUP.md) endpoint to set admin claims programmatically.

## Firestore Security Rules
Use the following Firestore rules as a starting point. These rules allow authenticated admin users to read/write asset and maintenance records, and allow unauthenticated guests to read only.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /assets/{assetId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null && request.auth.token.admin == true;
    }
    match /maintenanceLogs/{logId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start development server (Node.js backend)
npm run dev

# Open in browser
# Frontend: http://localhost:3000/V2-QAR/index.html
# Backend: http://localhost:5000 (if using Express backend)
```

## 📱 Usage

### Admin Workflow
1. Go to login page → Enter admin credentials
2. Add/edit/delete assets and maintenance records
3. Changes sync instantly to all connected users

### Guest/QR Scan Workflow
1. Access via shared link or scan QR code
2. View registry (read-only access)
3. See live updates as admins make changes

## 📚 Backend Setup (Optional)

For production deployments with backend authentication:
- See [BACKEND_SETUP.md](BACKEND_SETUP.md)
- Includes Express.js server with admin middleware
- Token verification and admin claim validation
- Production-ready security practices

> Note: This project currently falls back to a local demo login when Firebase Auth is unavailable, but the recommended approach is to use Firebase Auth with real admin accounts for production.
