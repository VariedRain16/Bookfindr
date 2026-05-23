# Bookfindr# 📚 BookFinder 95

> A book search and personal reading list tracker styled as a pixel-perfect Windows 95 desktop — with a dark grey cyberpunk twist and neon blue glow accents.

![BookFinder 95](https://img.shields.io/badge/Windows-95-blue?style=flat-square) ![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?style=flat-square) ![OpenLibrary](https://img.shields.io/badge/API-OpenLibrary-green?style=flat-square) ![GitHub Pages](https://img.shields.io/badge/Hosted-GitHub%20Pages-black?style=flat-square)

---

## ✨ Features

- 🔍 **Search** millions of books by title or author via the free OpenLibrary API
- 🖼️ **Cover art**, title, author, and year displayed on every result card
- 💾 **Save books** to a personal reading list stored in Firebase Firestore
- 🔄 **Toggle status** between *Want to Read* and *Read*
- 🗑️ **Delete books** from your list at any time
- 📋 **Filter** your list by All / Want to Read / Read
- 💾 **Persistent** — your list survives page refreshes and browser restarts
- 🖥️ **Windows 95 UI** — draggable windows, taskbar, Start menu, boot screen, system tray clock
- 💙 **Neon blue cyberpunk glow** on a dark grey desktop

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Database | Firebase Firestore (v9 modular SDK) |
| Book Data | OpenLibrary API (free, no key needed) |
| Hosting | GitHub Pages |

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/bookfinder-95.git
cd bookfinder-95
```

### 2. Set up Firebase

1. Go to [firebase.google.com](https://firebase.google.com) and sign in
2. Click **Add project** and give it a name (e.g. `bookfinder-95`)
3. Disable Google Analytics if you don't need it, then click **Create project**
4. In the left sidebar, click **Firestore Database** → **Create database**
5. Choose **Start in test mode** (you can add security rules later)
6. Select a region close to you and click **Enable**
7. In the left sidebar, click **Project Settings** (gear icon)
8. Scroll down to **Your apps** → click the **</>** (Web) icon
9. Register your app and copy the Firebase config object

### 3. Add your Firebase config

Open `app.js` and replace the placeholder config at the top:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Run locally

No build step needed — just open `index.html` in your browser, or use a simple local server:

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Then visit `http://localhost:8000`

---

## 🌐 Deploying to GitHub Pages

### Option A — GitHub UI

1. Push your code to a GitHub repository
2. Go to your repo → **Settings** → **Pages**
3. Under **Source**, select `Deploy from a branch`
4. Choose `main` branch and `/ (root)` folder
5. Click **Save** — your site will be live at `https://YOUR_USERNAME.github.io/bookfinder-95/`

### Option B — GitHub Actions (auto-deploy on push)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

---

## 🔒 Firebase Security Rules (recommended before going public)

In your Firebase console under **Firestore → Rules**, replace the default with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /books/{bookId} {
      allow read, write: if true; // Lock this down if adding auth
    }
  }
}
```

> ⚠️ For a public app, consider adding Firebase Authentication so each user only sees their own reading list.

---

## 📁 File Structure

```
bookfinder-95/
├── index.html       # App shell, Windows 95 desktop layout
├── style.css        # All Win95 + cyberpunk dark styles
├── app.js           # OpenLibrary search + Firebase logic
├── README.md        # You are here
└── AGENTS.md        # Architecture guide for AI agents
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--win-grey` | `#c0c0c0` | Window surfaces |
| `--win-dark` | `#2a2a2a` | Desktop background |
| `--win-darker` | `#1a1a1a` | Deeper backgrounds |
| `--neon-blue` | `#00d4ff` | Glow accents, focus states |
| `--win-title` | `#000080` | Title bar (classic navy) |
| `--win-white` | `#ffffff` | Inset panel highlights |

---

## 🙌 Credits

- Book data by [OpenLibrary](https://openlibrary.org) — free and open
- Database by [Firebase](https://firebase.google.com)
- Inspired by the legendary Windows 95 UI
