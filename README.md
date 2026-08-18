# 💰 BillSplitter

A full-stack, serverless multi-currency bill splitting web application built with **React 19**, **Vite**, **Firebase Authentication**, and **Cloud Firestore**. Deployed seamlessly on **Vercel**.

Split expenses with friends across different currencies (USD, EUR, GBP, INR), automatically calculate simplified settlement balances using a greedy algorithm, and track debts in real time.

---

## ✨ Features

- 🔐 **Firebase Authentication** — 1-click Google Sign-In and Email/Password account management.
- ⚡ **Cloud Firestore Real-Time DB** — Instant live synchronization for groups, expenses, and settlements.
- 💱 **Multi-Currency Support** — Track expenses in USD, EUR, GBP, INR with real-time conversion rates.
- 👥 **Group & Member Management** — Create custom groups (trips, rent, dinners) and add friends on the fly.
- 🧠 **Smart Debt Simplification** — Greedy graph algorithm minimizes the total number of transactions needed to settle all debts.
- 💸 **One-Click Settlement** — Settle up balances and clear debts instantly.
- 🎨 **Modern Dark Charcoal UI** — Sleek dark theme with warm amber accents.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite |
| **Authentication** | Firebase Authentication (Google OAuth 2.0 & Email/Password) |
| **Database (DBMS)** | Cloud Firestore (NoSQL Real-Time Database) |
| **Hosting** | Vercel |

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────┐
│             React 19 Client (Vercel)           │
│  ├── Auth State (Google / Email & Password)    │
│  ├── Greedy Debt Simplification Algorithm      │
│  └── Real-time Group & Expense Dashboard       │
└───────────────────────┬────────────────────────┘
                        │
                        │ Direct Real-Time SDK Calls
                        ▼
┌────────────────────────────────────────────────┐
│               FIREBASE SERVICES                │
│  ├── Firebase Auth (Identity & Sessions)       │
│  ├── Cloud Firestore (Groups & Expenses)       │
│  └── Firestore Security Rules                  │
└────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js 18+**
- **npm** or **pnpm** / **yarn**

### 2. Setup & Installation
```bash
# Clone the repository
git clone https://github.com/makkenameghanaaaa-dotcom/billsplitter.git
cd billsplitter

# Install dependencies and start development server
npm run dev
```

The app will run locally at `http://localhost:5173`.

---

## ⚙️ Environment Variables

Create a `.env` file in the `frontend/` directory (or use `.env.local`):

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef
```

> **How to get these keys**:
> 1. Go to [Firebase Console](https://console.firebase.google.com/).
> 2. Create a new Firebase Project.
> 3. Enable **Authentication** (under *Build* → *Authentication* → Enable **Email/Password** and **Google**).
> 4. Create a **Firestore Database** (under *Build* → *Firestore Database* → *Create Database*).
> 5. Click Project Settings (⚙️) → General → *Your apps* → *Web app (</>)* to get your config object.

---

## 🚀 Deploying to Vercel

1. **Import the repository** into [Vercel](https://vercel.com/new).
2. **Configure Build Settings**:
   - **Framework Preset**: `Vite` *(auto-detected)*
   - **Root Directory**: `./` *(or `frontend`)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend/dist` *(or `dist` if root is set to `frontend`)*
3. **Add Environment Variables** in Vercel:
   - Add the `VITE_FIREBASE_*` variables from your Firebase Console.
4. Click **Deploy**.

---

## 📁 Project Structure

```
billsplitter/
├── frontend/
│   ├── src/
│   │   ├── firebase.js                 # Firebase initialization & Auth helpers
│   │   ├── services/
│   │   │   └── firestoreService.js     # Real-time Firestore CRUD operations
│   │   ├── utils/
│   │   │   └── balanceCalculator.js    # Greedy debt simplification algorithm
│   │   ├── App.jsx                     # Core React component & UI views
│   │   ├── App.css                     # Responsive styling & themes
│   │   ├── index.css                   # Design tokens
│   │   └── main.jsx                    # Application entry point
│   ├── package.json
│   ├── vercel.json
│   └── vite.config.js
├── firestore.rules                     # Cloud Firestore security rules
├── vercel.json                         # Root Vercel deployment configuration
├── package.json                        # Root workspace scripts
└── README.md
```

---

## 📄 License
This project is open source and available under the MIT License.
