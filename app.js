/* ==========================================================================
   BookFinder 95 — App Logic (Unified Single-Window Mode)
   ========================================================================== */

import { initializeApp }     from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot,
         updateDoc, deleteDoc, doc, query, orderBy,
         serverTimestamp }   from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider,
         signOut, onAuthStateChanged } from "firebase/auth";

// ── Firebase Config ─────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyC6ZM4CvkWtxQtnCq8sFIZFuoCldk7c-w4",
  authDomain:        "bookfindr-565a6.firebaseapp.com",
  projectId:         "bookfindr-565a6",
  storageBucket:     "bookfindr-565a6.firebasestorage.app",
  messagingSenderId: "212049655393",
  appId:             "1:212049655393:web:df048e231afd30151e9c20"
};

// ── App State ───────────────────────────────────────────────────────────────
let db               = null;
let auth             = null;
let currentUser      = null;
let isGuestMode      = false;
let unsubscribeSnapshot = null;
let isFirebaseActive = false;
let readingList      = [];
let savedBookKeys    = new Set();

/* ==========================================================================
   FIREBASE / LOCAL-STORAGE INIT
   ========================================================================== */
function initFirebase() {
  const placeholder =
    !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("YOUR_");

  if (!placeholder) {
    try {
      const app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
      isFirebaseActive = true;
      setupAuthListener();
    } catch (e) {
      console.warn("Firebase init failed, using localStorage:", e);
      isFirebaseActive = false;
      continueAsGuest();
    }
  } else {
    isFirebaseActive = false;
    continueAsGuest();
  }
}

function setupAuthListener() {
  if (!auth) return;
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      isGuestMode = false;
      document.getElementById("signin-overlay")?.classList.add("hidden");
      updateAuthUI(true);
      loadReadingList();
    } else {
      updateAuthUI(false);
      if (isGuestMode) {
        document.getElementById("signin-overlay")?.classList.add("hidden");
        loadReadingList();
      } else {
        document.getElementById("signin-overlay")?.classList.remove("hidden");
      }
    }
    updateTray();
  });
}

function updateAuthUI(signedIn) {
  const fileAuthText = document.getElementById("menu-file-auth-text");
  const fileAuthIcon = document.getElementById("menu-file-auth-icon");
  const startAuthText = document.getElementById("start-auth-text");
  const startAuthIcon = document.getElementById("start-auth-icon");
  const trayUser = document.getElementById("tray-user");
  const trayAvatar = document.getElementById("tray-avatar");
  const trayUsername = document.getElementById("tray-username");
  const trayAuthSep = document.getElementById("tray-auth-sep");

  if (signedIn && currentUser) {
    if (fileAuthText) fileAuthText.textContent = "Sign Out";
    if (fileAuthIcon) fileAuthIcon.className = "fa-solid fa-right-from-bracket";
    if (startAuthText) startAuthText.textContent = "Sign Out";
    if (startAuthIcon) startAuthIcon.className = "fa-solid fa-right-from-bracket";

    if (trayUser) {
      trayUser.classList.remove("hidden");
      if (trayAvatar) trayAvatar.src = currentUser.photoURL || "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";
      if (trayUsername) trayUsername.textContent = currentUser.displayName || currentUser.email || "User";
    }
    if (trayAuthSep) trayAuthSep.classList.remove("hidden");
  } else {
    if (fileAuthText) fileAuthText.textContent = "Sign In...";
    if (fileAuthIcon) fileAuthIcon.className = "fa-solid fa-right-to-bracket";
    if (startAuthText) startAuthText.textContent = "Sign In...";
    if (startAuthIcon) startAuthIcon.className = "fa-solid fa-right-to-bracket";

    if (trayUser) {
      trayUser.classList.add("hidden");
      if (trayAuthSep) trayAuthSep.classList.add("hidden");
    }
  }
}

async function handleAuthClick() {
  if (currentUser) {
    if (confirm("Are you sure you want to sign out?")) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error("Sign out error:", e);
      }
    }
  } else {
    document.getElementById("signin-overlay")?.classList.remove("hidden");
  }
}

async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error("Sign in failed:", e);
    alert("Sign in failed. Make sure Google Auth is enabled in the Firebase Console.\nError: " + e.message);
  }
}

function continueAsGuest() {
  isGuestMode = true;
  document.getElementById("signin-overlay")?.classList.add("hidden");
  updateTray();
  loadReadingList();
}

function updateTray() {
  const dot  = document.getElementById("tray-db-dot");
  const text = document.getElementById("tray-db-text");
  if (!dot || !text) return;
  if (isFirebaseActive && currentUser) {
    dot.classList.add("online");
    text.textContent = "Firestore";
  } else {
    dot.classList.remove("online");
    text.textContent = "Local";
  }
}

/* ==========================================================================
   APP INIT (runs after boot)
   ========================================================================== */
function initApp() {
  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Panel focus toggling
  ["search-panel", "list-panel"].forEach(id => {
    document.getElementById(id)?.addEventListener("pointerdown", () => setActivePanel(id));
  });

  // Close click outside start menu
  document.addEventListener("click", e => {
    const menu = document.getElementById("start-menu");
    const btn  = document.getElementById("start-button");
    if (menu && !menu.classList.contains("hidden") &&
        !menu.contains(e.target) && !btn.contains(e.target)) {
      toggleStartMenu(false);
    }
  });
}

function setActivePanel(id) {
  document.getElementById("search-panel")?.classList.toggle("active", id === "search-panel");
  document.getElementById("list-panel")?.classList.toggle("active", id === "list-panel");
}

/* ==========================================================================
   CLOCK
   ========================================================================== */
function updateClock() {
  const el = document.getElementById("tray-clock");
  if (!el) return;
  const d = new Date();
  let h   = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const a = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  el.textContent = `${h}:${m} ${a}`;
}

/* ==========================================================================
   START MENU
   ========================================================================== */
function toggleStartMenu(force) {
  const menu = document.getElementById("start-menu");
  const btn  = document.getElementById("start-button");
  if (!menu) return;
  const show = typeof force === "boolean" ? force : menu.classList.contains("hidden");
  menu.classList.toggle("hidden", !show);
  btn?.classList.toggle("active", show);
}

/* ==========================================================================
   SHUTDOWN / ABOUT
   ========================================================================== */
function showShutdown() {
  toggleStartMenu(false);
  document.getElementById("shutdown-overlay")?.classList.remove("hidden");
}

function showAbout()   { document.getElementById("about-modal-overlay")?.classList.remove("hidden"); }
function hideAbout()   { document.getElementById("about-modal-overlay")?.classList.add("hidden"); }

/* ==========================================================================
   BOOK SEARCH — OpenLibrary
   ========================================================================== */
async function searchBooks(q) {
  q = q.trim();
  if (!q) return;

  const results = document.getElementById("search-results");
  const status  = document.getElementById("search-status");
  setActivePanel("search-panel");

  results.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Querying Library Network for "${escHTML(q)}"…</p>
    </div>`;
  status.textContent = `Searching for "${q}"…`;

  try {
    const url  = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    if (!data.docs?.length) {
      results.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-face-frown"></i>
          <p>No results found for "${escHTML(q)}".</p>
        </div>`;
      status.textContent = "0 results found.";
      return;
    }

    const grid = document.createElement("div");
    grid.className = "results-grid";

    data.docs.forEach(book => {
      const wrap = document.createElement("div");
      wrap.style.display = "contents";
      wrap.innerHTML = renderResultCard(book);
      const card = wrap.firstElementChild;

      card.querySelector(".save-btn")?.addEventListener("click", () => {
        saveBook({
          id:      book.key,
          title:   book.title   || "Unknown Title",
          author:  book.author_name?.[0] || "Unknown Author",
          year:    book.first_publish_year || null,
          coverId: book.cover_i || null,
        }, card.querySelector(".save-btn"));
      });

      grid.appendChild(card);
    });

    results.innerHTML = "";
    results.appendChild(grid);
    status.textContent = `${data.docs.length} results found.`;

  } catch (err) {
    console.error(err);
    results.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>Search failed: ${escHTML(err.message)}</p>
      </div>`;
    status.textContent = "Search error.";
  }
}

function renderResultCard(book) {
  const id     = book.key;
  const title  = book.title   || "Unknown Title";
  const author = book.author_name?.[0] || "Unknown Author";
  const year   = book.first_publish_year || "—";
  const cover  = book.cover_i
    ? `<img class="book-cover-img" src="https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg" alt="${escHTML(title)}" loading="lazy">`
    : `<div class="book-cover-placeholder"><i class="fa-solid fa-book-skull"></i><span>No Cover</span></div>`;
  const saved  = savedBookKeys.has(id);

  return `
    <div class="book-card">
      <div class="book-cover-container">${cover}</div>
      <div class="book-info">
        <span class="book-title"  title="${escHTML(title)}">${escHTML(title)}</span>
        <span class="book-author" title="${escHTML(author)}">${escHTML(author)}</span>
        <span class="book-year">${year}</span>
      </div>
      <button class="win95-btn win95-raised save-btn ${saved ? "saved" : ""}" data-work-id="${escHTML(id)}">
        <i class="fa-solid ${saved ? "fa-check" : "fa-floppy-disk"}"></i>
        ${saved ? "Saved" : "Save"}
      </button>
    </div>`;
}

/* ==========================================================================
   READING LIST — CRUD
   ========================================================================== */
async function saveBook(data, btn) {
  if (savedBookKeys.has(data.id)) return;
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving…`;

  const payload = {
    id:      data.id,
    title:   data.title,
    author:  data.author,
    year:    data.year,
    coverId: data.coverId,
    status:  "want",
    savedAt: (isFirebaseActive && currentUser) ? serverTimestamp() : new Date().toISOString(),
  };

  try {
    if (isFirebaseActive && currentUser) {
      await addDoc(collection(db, "users", currentUser.uid, "books"), payload);
    } else {
      const list = localGet();
      list.unshift(payload);
      localSet(list);
      onLocalChange();
    }
    savedBookKeys.add(data.id);
    btn.className = "win95-btn win95-raised save-btn saved";
    btn.innerHTML = `<i class="fa-solid fa-check"></i> Saved`;
  } catch (e) {
    console.error(e);
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save`;
    alert("Error saving book. Check console.");
  }
}

function loadReadingList() {
  const status = document.getElementById("list-status");

  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  if (isFirebaseActive && currentUser) {
    status.textContent = "Connecting to Firestore…";
    const q = query(collection(db, "users", currentUser.uid, "books"), orderBy("savedAt", "desc"));
    unsubscribeSnapshot = onSnapshot(q, snap => {
      readingList = [];
      savedBookKeys.clear();
      snap.forEach(d => {
        const item = { ...d.data(), docId: d.id };
        readingList.push(item);
        savedBookKeys.add(item.id);
      });
      renderList();
      updateStats();
      status.textContent = "Firestore sync active.";
    }, err => {
      console.error(err);
      status.textContent = "Sync error. Using local storage.";
      onLocalChange();
    });
  } else {
    onLocalChange();
  }
}

function onLocalChange() {
  const raw = localGet();
  raw.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  readingList = raw.map((item, i) => ({ ...item, docId: String(i) }));
  savedBookKeys.clear();
  readingList.forEach(b => savedBookKeys.add(b.id));
  renderList();
  updateStats();
  document.getElementById("list-status").textContent = "Local storage active.";
}

async function toggleStatus(docId, current) {
  const next = current === "read" ? "want" : "read";
  if (isFirebaseActive && currentUser) {
    await updateDoc(doc(db, "users", currentUser.uid, "books", docId), { status: next });
  } else {
    const list  = localGet();
    const idx   = parseInt(docId);
    if (list[idx]) { list[idx].status = next; localSet(list); onLocalChange(); }
  }
}

async function deleteBook(docId) {
  if (!confirm("Remove this book from your list?")) return;
  const book = readingList.find(b => b.docId === docId);
  if (isFirebaseActive && currentUser) {
    await deleteDoc(doc(db, "users", currentUser.uid, "books", docId));
  } else {
    const list = localGet();
    list.splice(parseInt(docId), 1);
    localSet(list);
    onLocalChange();
  }
  if (book) {
    savedBookKeys.delete(book.id);
    refreshSaveBtns();
  }
}

function refreshSaveBtns() {
  document.querySelectorAll(".save-btn[data-work-id]").forEach(btn => {
    if (!savedBookKeys.has(btn.dataset.workId)) {
      btn.className = "win95-btn win95-raised save-btn";
      btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save`;
      btn.disabled  = false;
    }
  });
}

/* ==========================================================================
   RENDER — Reading List
   ========================================================================== */
function renderList() {
  const filter    = document.getElementById("list-filter-select").value;
  const container = document.getElementById("reading-list-container");
  if (!container) return;

  const filtered = readingList.filter(b =>
    filter === "all" ? true : b.status === filter
  );

  if (!filtered.length) {
    container.innerHTML = `
      <div class="list-empty">
        <i class="fa-solid fa-ghost"></i>
        <p>${filter === "all" ? "Your reading list is empty." : "No books matching this filter."}</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="list-header-row">
      <div class="list-header-cell">Cover</div>
      <div class="list-header-cell">Title</div>
      <div class="list-header-cell">Author</div>
      <div class="list-header-cell">Year</div>
      <div class="list-header-cell">Actions</div>
    </div>
    ${filtered.map(renderListItem).join("")}`;

  container.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => toggleStatus(btn.dataset.docId, btn.dataset.status));
  });
  container.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteBook(btn.dataset.docId));
  });
}

function renderListItem(book) {
  const cover = book.coverId
    ? `<img src="https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg" alt="" loading="lazy">`
    : `<i class="fa-solid fa-book-skull" style="color:var(--win-grey-dark)"></i>`;
  const isRead = book.status === "read";

  return `
    <div class="list-row">
      <div class="list-cell cover">
        <div class="list-cell-thumb">${cover}</div>
      </div>
      <div class="list-cell title-cell" title="${escHTML(book.title)}">${escHTML(book.title)}</div>
      <div class="list-cell" title="${escHTML(book.author)}">${escHTML(book.author)}</div>
      <div class="list-cell year">${book.year || "—"}</div>
      <div class="list-cell actions">
        <button class="win95-btn win95-raised toggle-btn ${isRead ? "read" : "want"}"
                data-doc-id="${escHTML(book.docId)}" data-status="${book.status}">
          <i class="fa-solid ${isRead ? "fa-square-check" : "fa-square"}"></i>
          ${isRead ? "Read" : "Want"}
        </button>
        <button class="win95-btn win95-raised delete-btn" data-doc-id="${escHTML(book.docId)}">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>`;
}

function updateStats() {
  const read = readingList.filter(b => b.status === "read").length;
  const want = readingList.length - read;
  const r = document.getElementById("stats-read");
  const w = document.getElementById("stats-want");
  if (r) r.textContent = read;
  if (w) w.textContent = want;
}

/* ==========================================================================
   LOCAL STORAGE HELPERS
   ========================================================================== */
const localGet = ()       => JSON.parse(localStorage.getItem("books95") || "[]");
const localSet = list     => localStorage.setItem("books95", JSON.stringify(list));

/* ==========================================================================
   SANITIZER
   ========================================================================== */
function escHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

/* ==========================================================================
   EVENT WIRING — runs on DOMContentLoaded
   ========================================================================== */
window.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  initApp();

  // Sign In / Sign Out wiring
  document.getElementById("signin-google-btn")?.addEventListener("click", signInWithGoogle);
  document.getElementById("signin-guest-btn")?.addEventListener("click", continueAsGuest);
  document.getElementById("menu-file-auth")?.addEventListener("click", handleAuthClick);
  document.getElementById("start-auth-trigger")?.addEventListener("click", () => {
    toggleStartMenu(false);
    handleAuthClick();
  });
  document.getElementById("tray-signout-btn")?.addEventListener("click", handleAuthClick);

  // Search
  const inp = document.getElementById("search-input");
  const btn = document.getElementById("search-submit");
  btn?.addEventListener("click",  () => searchBooks(inp.value));
  inp?.addEventListener("keypress", e => { if (e.key === "Enter") searchBooks(inp.value); });

  // Filter
  document.getElementById("list-filter-select")
    ?.addEventListener("change", renderList);

  // Start menu
  document.getElementById("start-button")
    ?.addEventListener("click", e => { e.stopPropagation(); toggleStartMenu(); });

  // Start menu items
  document.getElementById("start-about-trigger")
    ?.addEventListener("click", () => { toggleStartMenu(false); showAbout(); });
  document.getElementById("start-menu-shutdown")
    ?.addEventListener("click", showShutdown);

  // Menu bar items
  document.getElementById("menu-file-shutdown") ?.addEventListener("click", showShutdown);
  document.getElementById("menu-help-about")    ?.addEventListener("click", showAbout);
  document.getElementById("menu-view-search")
    ?.addEventListener("click", () => { setActivePanel("search-panel"); document.getElementById("search-input")?.focus(); });
  document.getElementById("menu-view-list")
    ?.addEventListener("click", () => setActivePanel("list-panel"));

  // Title bar buttons
  document.getElementById("title-bar-close")?.addEventListener("click", showShutdown);
  document.getElementById("title-bar-min")  ?.addEventListener("click", () => {
    /* no-op on a web app — could minimize taskbar icon visually */
  });
  document.getElementById("title-bar-max")  ?.addEventListener("click", () => {
    /* already full screen — no-op */
  });

  // About modal
  document.getElementById("about-close-btn")?.addEventListener("click", hideAbout);
  document.getElementById("about-ok-btn")   ?.addEventListener("click", hideAbout);

  // Shutdown / reboot
  document.getElementById("reboot-btn")?.addEventListener("click", () => window.location.reload());
});
