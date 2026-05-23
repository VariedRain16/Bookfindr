# 🤖 AGENTS.md — BookFinder 95

This document is written for AI coding agents (Anthropic Claude, GitHub Copilot, Cursor, etc.) that need to understand, modify, or extend this codebase. Read this before making any changes.

---

## 🗺️ Project Overview

BookFinder 95 is a **single-page web application** with no build system. There are three files that matter:

| File | Role |
|------|------|
| `index.html` | DOM structure — the Windows 95 desktop, all window shells |
| `style.css` | All visual styling — Win95 chrome, dark theme, neon glows |
| `app.js` | All logic — Firebase init, OpenLibrary search, reading list CRUD |

There is no framework, no bundler, no npm. Everything runs directly in the browser.

---

## 🏗️ Architecture

```
Browser
│
├── index.html         ← Static shell (desktop, windows, taskbar)
│     └── loads style.css + app.js (module)
│
├── app.js (ES module)
│     ├── Firebase init + Firestore connection
│     ├── OpenLibrary API calls (fetch)
│     ├── DOM manipulation (search results, reading list rendering)
│     └── Window manager (drag, minimize, maximize, close)
│
└── style.css
      ├── CSS variables (design tokens)
      ├── Win95 component styles (windows, buttons, title bars, taskbar)
      ├── Dark desktop + neon glow effects
      └── Responsive breakpoints (mobile stacking)
```

---

## 🔌 External Dependencies

### OpenLibrary API
- **Base URL:** `https://openlibrary.org/search.json`
- **Query param:** `?q=SEARCH_TERM&limit=20`
- **No API key required**
- **Cover images:** `https://covers.openlibrary.org/b/id/{cover_id}-M.jpg`
- **Key fields used:** `title`, `author_name[]`, `first_publish_year`, `cover_i`
- **Docs:** https://openlibrary.org/developers/api

### Firebase Firestore (v9 modular SDK)
- **Loaded via CDN** in `app.js` — no npm install
- **Collection:** `books`
- **Document shape:**
```js
{
  id: string,           // OpenLibrary work key (e.g. "/works/OL45804W")
  title: string,
  author: string,
  year: number | null,
  coverId: number | null,
  status: "want" | "read",
  savedAt: Timestamp
}
```
- **Operations used:** `addDoc`, `getDocs`, `updateDoc`, `deleteDoc`, `onSnapshot`

---

## 📦 Key Functions in app.js

| Function | What it does |
|----------|-------------|
| `initFirebase()` | Initialises Firebase app and Firestore instance |
| `searchBooks(query)` | Fetches from OpenLibrary, renders result cards |
| `saveBook(bookData)` | Adds a book document to Firestore `books` collection |
| `loadReadingList()` | Sets up a Firestore `onSnapshot` listener, re-renders list on change |
| `toggleStatus(docId, current)` | Flips status between `"want"` and `"read"` |
| `deleteBook(docId)` | Removes a document from Firestore |
| `renderResultCard(book)` | Returns HTML string for a search result card |
| `renderListItem(book)` | Returns HTML string for a reading list row |
| `initWindowManager()` | Attaches drag listeners to all `.title-bar` elements |
| `showWindow(id)` | Makes a window visible and brings it to front |
| `closeWindow(id)` | Hides a window |
| `updateClock()` | Updates the taskbar system tray clock every second |

---

## 🎨 CSS Architecture

All design tokens are CSS variables defined at `:root` in `style.css`. Always use these variables — never hard-code colours or spacing.

```css
:root {
  --win-grey: #c0c0c0;      /* Window surface */
  --win-dark: #2a2a2a;      /* Desktop background */
  --win-darker: #1a1a1a;    /* Deeper dark surfaces */
  --win-title: #000080;     /* Title bar navy */
  --win-white: #ffffff;     /* Inset highlight */
  --win-shadow: #808080;    /* Bevel shadow */
  --neon-blue: #00d4ff;     /* Cyberpunk accent + glow */
  --neon-glow: 0 0 8px #00d4ff, 0 0 20px #00d4ff44; /* Box shadow glow */
}
```

Win95 bevel effect (used on windows, buttons, inset panels) is achieved with `box-shadow` using two colours — never `border` alone.

---

## 🪟 Window System

Windows are `div.win95-window` elements. The window manager in `app.js` handles:

- **Drag:** Mousedown on `.title-bar` → track mousemove → update `left`/`top`
- **Z-index:** Clicking any window calls `bringToFront(id)` which sets `z-index: 100` on it and resets others to `10`
- **Show/hide:** Toggle `.hidden` class
- **Minimize:** Collapses window to just the title bar
- **Maximize:** Sets window to fill viewport

To add a new window:
1. Add a `div.win95-window` in `index.html` with a unique `id`
2. Give it a `.title-bar` child with `data-window="YOUR_ID"`
3. The window manager picks it up automatically — no extra JS needed

---

## ➕ How to Extend This App

### Add a new feature window
1. Copy an existing `div.win95-window` block in `index.html`
2. Give it a new `id` and update the title bar text
3. Add a taskbar button that calls `showWindow('yourNewId')`
4. Write any logic in `app.js`

### Add a new Firestore field
1. Add it to the document object in `saveBook()`
2. Read it in `renderListItem()` or `renderResultCard()`
3. If it needs updating, add a new function following the `toggleStatus()` pattern

### Change the colour scheme
Only edit the CSS variables in `:root`. Every component inherits from them.

### Add user authentication
1. Enable Firebase Auth in the Firebase console
2. Import `getAuth`, `signInAnonymously` or `signInWithPopup` from Firebase Auth CDN
3. Scope Firestore reads/writes to `users/{uid}/books/{bookId}` instead of `books/{bookId}`
4. Update Firestore security rules accordingly

---

## ⚠️ Things to Avoid

- **Do not introduce a bundler or framework** — this is intentionally dependency-free
- **Do not use `innerHTML` with unsanitized user input** — always sanitize or use `textContent`
- **Do not add more than one Firestore listener** — `onSnapshot` is already set up in `loadReadingList()`; adding a second one will cause double-renders
- **Do not hard-code colours** — always use CSS variables
- **Do not break the bevel shadow pattern** — Win95 windows rely on precise `box-shadow` values; changing them will break the aesthetic

---

## 🧪 Testing Checklist

Before committing changes, verify:

- [ ] Search returns results for a known title (e.g. "Dune")
- [ ] Save button adds a book to Firestore and it appears in the reading list
- [ ] Status toggle switches between Want to Read and Read
- [ ] Delete removes the book from both the list and Firestore
- [ ] Filter dropdown correctly filters the list
- [ ] Page refresh — reading list repopulates from Firestore
- [ ] Windows are draggable
- [ ] Boot screen plays on first load
- [ ] Clock updates in the taskbar
- [ ] No console errors

---

## 📞 Key API Reference

```js
// Search OpenLibrary
GET https://openlibrary.org/search.json?q=dune&limit=20

// Get cover image
GET https://covers.openlibrary.org/b/id/12345-M.jpg

// Firestore (v9 modular)
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc } from "firebase/firestore"
```
