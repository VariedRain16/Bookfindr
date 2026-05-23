/* ==========================================================================
   BookFinder 95 — Core Client Application Logic
   ========================================================================== */

import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";

// Firebase Configuration (Replace with your own settings)
const firebaseConfig = {
  apiKey: "AIzaSyC6ZM4CvkWtxQtnCq8sFIZFuoCldk7c-w4",
  authDomain: "bookfindr-565a6.firebaseapp.com",
  projectId: "bookfindr-565a6",
  storageBucket: "bookfindr-565a6.firebasestorage.app",
  messagingSenderId: "212049655393",
  appId: "1:212049655393:web:df048e231afd30151e9c20"
};

// State Variables
let db = null;
let isFirebaseActive = false;
let activeWindows = []; // Tracks order of windows for z-index
let readingList = [];    // Local copy of books for rendering and filtering
let savedBookKeys = new Set(); // Set of OL book keys currently saved in the reading list

/* ==========================================================================
   Boot Screen Simulation & BIOS Logs
   ========================================================================== */
const BOOT_LOG_LINES = [
  "AMIBIOS (C) 1995 American Megatrends, Inc.",
  "BOOKFINDER COMPUTER CORP. SYSTEM V4.00.950",
  "CPU: Cyrix 6x86 P166+ clocking at 133 MHz",
  "Memory Test: 16384 KB OK",
  "Detecting IDE Primary Master ... CyberDisk 1.2GB",
  "Detecting IDE Primary Slave  ... CyberDrive CD-ROM 4x",
  "Loading CyberOS Device Drivers ... OK",
  "Connecting to Virtual Library Core ... OK",
  "Initializing Cyberpunk Glow Engine ... OK",
  "Checking Database Service Core ...",
];

async function runBootScreen() {
  const consoleEl = document.getElementById("boot-logs-console");
  const progressEl = document.getElementById("boot-progress");
  
  if (!consoleEl) return;
  
  const logDelay = 220;
  
  for (let i = 0; i < BOOT_LOG_LINES.length; i++) {
    const line = document.createElement("div");
    line.textContent = "   " + BOOT_LOG_LINES[i];
    consoleEl.appendChild(line);
    
    consoleEl.scrollTop = consoleEl.scrollHeight;
    
    const pct = Math.floor(((i + 1) / BOOT_LOG_LINES.length) * 100);
    progressEl.style.width = pct + "%";
    
    await delay(logDelay);
  }

  const finalLine = document.createElement("div");
  finalLine.textContent = isFirebaseActive 
    ? "   Database Status: FIRESTORE LIVE CONNECTIVITY ESTABLISHED."
    : "   Database Status: NO CONFIG DETECTED. FALLING BACK TO CYBER-RAM (LOCAL STORAGE).";
  consoleEl.appendChild(finalLine);
  consoleEl.scrollTop = consoleEl.scrollHeight;
  progressEl.style.width = "100%";
  
  await delay(600);
  dismissBootScreen();
}

function dismissBootScreen() {
  const bootScreen = document.getElementById("boot-screen");
  if (bootScreen && !bootScreen.classList.contains("fade-out")) {
    bootScreen.classList.add("fade-out");
    setTimeout(() => {
      bootScreen.style.display = "none";
    }, 800);
    initDesktop();
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ==========================================================================
   Database Core (Firebase & LocalStorage dual mode)
   ========================================================================== */
function initFirebase() {
  const isPlaceholder = 
    !firebaseConfig.apiKey || 
    firebaseConfig.apiKey.startsWith("YOUR_") || 
    firebaseConfig.projectId.startsWith("YOUR_");

  if (!isPlaceholder) {
    try {
      const app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      isFirebaseActive = true;
      console.log("Firebase Firestore initialized successfully.");
    } catch (err) {
      console.error("Firebase connection failed, falling back to Local Storage:", err);
      isFirebaseActive = false;
    }
  } else {
    console.log("Using placeholder Firebase credentials. Loading app in Local Storage fallback mode.");
    isFirebaseActive = false;
  }
  
  updateDbStatusTray();
}

function updateDbStatusTray() {
  const dotEl = document.getElementById("tray-db-dot");
  const textEl = document.getElementById("tray-db-text");
  const trayEl = document.getElementById("tray-db-status");
  
  if (isFirebaseActive) {
    dotEl.classList.add("online");
    textEl.textContent = "Firestore";
    trayEl.title = "Connected to Firebase Firestore (Realtime)";
  } else {
    dotEl.classList.remove("online");
    textEl.textContent = "Local DB";
    trayEl.title = "Connected to Local Storage Fallback Mode";
  }
}

/* ==========================================================================
   Desktop & Window Manager Implementation
   ========================================================================== */
function initDesktop() {
  updateClock();
  setInterval(updateClock, 1000);
  
  document.addEventListener("click", (e) => {
    const startMenu = document.getElementById("start-menu");
    const startBtn = document.getElementById("start-button");
    
    if (startMenu && !startMenu.classList.contains("hidden")) {
      if (!startMenu.contains(e.target) && !startBtn.contains(e.target)) {
        toggleStartMenu(false);
      }
    }
  });

  initWindowManager();
  
  showWindow("search-window");
  showWindow("list-window");
  
  loadReadingList();
}

// System Tray Clock
function updateClock() {
  const clockEl = document.getElementById("tray-clock");
  if (!clockEl) return;
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  clockEl.textContent = `${hours}:${minutes} ${ampm}`;
}

// Start Menu Toggling
function toggleStartMenu(forceState) {
  const menu = document.getElementById("start-menu");
  const btn = document.getElementById("start-button");
  if (!menu || !btn) return;
  
  const show = typeof forceState === "boolean" ? forceState : menu.classList.contains("hidden");
  
  if (show) {
    menu.classList.remove("hidden");
    btn.classList.add("pressed");
    menu.style.zIndex = 2000;
  } else {
    menu.classList.add("hidden");
    btn.classList.remove("pressed");
  }
}

// Window manager configurations
function initWindowManager() {
  const windows = document.querySelectorAll(".win95-window");
  
  activeWindows = Array.from(windows).map(win => win.id);
  
  windows.forEach(win => {
    const titleBar = win.querySelector(".title-bar");
    
    win.addEventListener("pointerdown", () => {
      bringToFront(win.id);
    });

    if (titleBar) {
      titleBar.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (e.target.closest(".title-bar-btn")) return;
        if (win.classList.contains("maximized")) return;
        
        bringToFront(win.id);
        
        const rect = win.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        
        titleBar.setPointerCapture(e.pointerId);
        
        function onPointerMove(moveEvent) {
          let left = moveEvent.clientX - offsetX;
          let top = moveEvent.clientY - offsetY;
          
          const desktopRect = document.body.getBoundingClientRect();
          const taskbarHeight = 40;
          
          left = Math.max(-rect.width + 50, Math.min(left, desktopRect.width - 50));
          top = Math.max(0, Math.min(top, desktopRect.height - taskbarHeight - 20));
          
          win.style.left = left + "px";
          win.style.top = top + "px";
          win.style.transform = "none";
        }
        
        function onPointerUp(upEvent) {
          titleBar.releasePointerCapture(upEvent.pointerId);
          titleBar.removeEventListener("pointermove", onPointerMove);
          titleBar.removeEventListener("pointerup", onPointerUp);
        }
        
        titleBar.addEventListener("pointermove", onPointerMove);
        titleBar.addEventListener("pointerup", onPointerUp);
      });
    }

    const minBtn = win.querySelector('[data-action="minimize"]');
    const maxBtn = win.querySelector('[data-action="maximize"]');
    const closeBtns = win.querySelectorAll('[data-action="close"]');
    
    if (minBtn) {
      minBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        minimizeWindow(win.id);
      });
    }
    
    if (maxBtn) {
      maxBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMaximizeWindow(win.id);
      });
    }
    
    closeBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeWindow(win.id);
      });
    });
  });
}

function bringToFront(id) {
  const win = document.getElementById(id);
  if (!win) return;
  
  activeWindows = activeWindows.filter(wId => wId !== id);
  activeWindows.push(id);
  
  activeWindows.forEach((wId, idx) => {
    const currentWin = document.getElementById(wId);
    const tabEl = document.getElementById(`tab-${wId}`);
    
    if (currentWin) {
      if (wId === id) {
        currentWin.style.zIndex = 100;
        currentWin.classList.add("active");
        if (tabEl) tabEl.classList.add("active");
      } else {
        currentWin.style.zIndex = 10 + idx;
        currentWin.classList.remove("active");
        if (tabEl) tabEl.classList.remove("active");
      }
    }
  });
}

function showWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  
  win.classList.remove("hidden");
  win.classList.remove("minimized");
  
  upsertTaskbarTab(id);
  bringToFront(id);
}

function closeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  
  win.classList.add("hidden");
  removeTaskbarTab(id);
}

function minimizeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  
  win.classList.add("minimized");
  
  const tabEl = document.getElementById(`tab-${id}`);
  if (tabEl) tabEl.classList.remove("active");
}

function toggleMaximizeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  
  win.classList.toggle("maximized");
  
  const maxBtn = win.querySelector('[data-action="maximize"]');
  if (maxBtn) {
    maxBtn.textContent = win.classList.contains("maximized") ? "[#]" : "[ ]";
  }
}

// Taskbar tabs management
function upsertTaskbarTab(windowId) {
  const tabsContainer = document.getElementById("taskbar-tabs");
  if (!tabsContainer) return;
  
  let tab = document.getElementById(`tab-${windowId}`);
  const titleText = document.querySelector(`#${windowId} .title-bar-text span`).textContent;
  const iconClass = document.querySelector(`#${windowId} .title-bar-text i`).className;
  
  if (!tab) {
    tab = document.createElement("button");
    tab.id = `tab-${windowId}`;
    tab.className = "win95-btn win95-raised taskbar-tab";
    tab.innerHTML = `<i class="${iconClass}"></i><span>${titleText}</span>`;
    
    tab.addEventListener("click", () => {
      const win = document.getElementById(windowId);
      if (win.classList.contains("minimized") || win.classList.contains("hidden")) {
        showWindow(windowId);
      } else if (win.classList.contains("active")) {
        minimizeWindow(windowId);
      } else {
        bringToFront(windowId);
      }
    });
    
    tabsContainer.appendChild(tab);
  }
}

function removeTaskbarTab(windowId) {
  const tab = document.getElementById(`tab-${windowId}`);
  if (tab) {
    tab.remove();
  }
}

/* ==========================================================================
   OpenLibrary Book Search Engine
   ========================================================================== */
async function searchBooks(query) {
  const resultsContainer = document.getElementById("search-results");
  const statusEl = document.getElementById("search-status");
  
  if (!query.trim()) return;
  
  resultsContainer.innerHTML = `
    <div class="no-results">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Consulting Library Network databases for "${escapeHTML(query)}"...</p>
    </div>
  `;
  statusEl.textContent = `Searching for "${query}"...`;
  
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenLibrary API returned error state ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.docs || data.docs.length === 0) {
      resultsContainer.innerHTML = `
        <div class="no-results">
          <i class="fa-solid fa-face-frown"></i>
          <p>No matches found in cyber-archives. Check spellings.</p>
        </div>
      `;
      statusEl.textContent = "Search complete. 0 matches found.";
      return;
    }
    
    resultsContainer.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "results-grid";
    
    data.docs.forEach(book => {
      const cardHtml = renderResultCard(book);
      const cardWrapper = document.createElement("div");
      cardWrapper.style.display = "contents";
      cardWrapper.innerHTML = cardHtml;
      
      const card = cardWrapper.firstElementChild;
      
      // Hook save click
      const saveBtn = card.querySelector(".save-btn");
      if (saveBtn) {
        saveBtn.addEventListener("click", () => {
          saveBook({
            id: book.key,
            title: book.title || "Unknown Title",
            author: book.author_name ? book.author_name.join(", ") : "Unknown Author",
            year: book.first_publish_year || null,
            coverId: book.cover_i || null
          }, saveBtn);
        });
      }
      
      grid.appendChild(card);
    });
    
    resultsContainer.appendChild(grid);
    statusEl.textContent = `Found ${data.docs.length} books in Library network.`;
    
  } catch (error) {
    console.error("OpenLibrary search failed:", error);
    resultsContainer.innerHTML = `
      <div class="no-results">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>API Network Fault: Could not fetch book records.</p>
        <span style="font-size:10px; color:#ff3b30;">${escapeHTML(error.message)}</span>
      </div>
    `;
    statusEl.textContent = "Search failed due to a network connection error.";
  }
}

// Renders the HTML string for a single search result card
function renderResultCard(book) {
  const workId = book.key;
  const title = book.title || "Unknown Title";
  const author = book.author_name ? book.author_name.join(", ") : "Unknown Author";
  const year = book.first_publish_year || "Unknown Year";
  const coverId = book.cover_i || null;
  const isSaved = savedBookKeys.has(workId);
  
  const coverSrc = coverId 
    ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` 
    : "";

  return `
    <div class="book-card">
      <div class="book-cover-container">
        ${coverSrc 
          ? `<img class="book-cover-img" src="${coverSrc}" alt="${escapeHTML(title)}" loading="lazy">` 
          : `<div class="book-cover-placeholder">
               <i class="fa-solid fa-book-skull"></i>
               <span>NO COVER ARCHIVE</span>
             </div>`
        }
      </div>
      <div class="book-info">
        <span class="book-title" title="${escapeHTML(title)}">${escapeHTML(title)}</span>
        <span class="book-author" title="${escapeHTML(author)}">${escapeHTML(author)}</span>
        <span class="book-year">${year}</span>
      </div>
      <button class="win95-btn win95-raised save-btn ${isSaved ? 'saved' : ''}" data-work-id="${escapeHTML(workId)}">
        <i class="fa-solid ${isSaved ? 'fa-check' : 'fa-floppy-disk'}"></i>
        <span>${isSaved ? 'Saved' : 'Save'}</span>
      </button>
    </div>
  `;
}

/* ==========================================================================
   Reading List CRUD Core & Sync Module
   ========================================================================== */

// Save book data
async function saveBook(bookData, saveButton) {
  if (savedBookKeys.has(bookData.id)) return;
  
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Saving...</span>`;
  }
  
  const docPayload = {
    id: bookData.id,
    title: bookData.title,
    author: bookData.author,
    year: bookData.year,
    coverId: bookData.coverId,
    status: "want",
    savedAt: isFirebaseActive ? serverTimestamp() : new Date().toISOString()
  };

  try {
    if (isFirebaseActive) {
      const colRef = collection(db, "books");
      await addDoc(colRef, docPayload);
    } else {
      const localBooks = JSON.parse(localStorage.getItem("books95") || "[]");
      localBooks.push(docPayload);
      localStorage.setItem("books95", JSON.stringify(localBooks));
      onLocalListUpdate();
    }
    
    savedBookKeys.add(bookData.id);
    
    if (saveButton) {
      saveButton.className = "win95-btn win95-raised save-btn saved";
      saveButton.innerHTML = `<i class="fa-solid fa-check"></i><span>Saved</span>`;
      saveButton.disabled = true;
    }
  } catch (err) {
    console.error("Save book error:", err);
    alert("System Fault: Unable to write data to database cores.");
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = `<i class="fa-solid fa-floppy-disk"></i><span>Save</span>`;
    }
  }
}

// Real-time synchronization setting up onSnapshot listener
function loadReadingList() {
  const statusEl = document.getElementById("list-status");
  
  if (isFirebaseActive) {
    statusEl.textContent = "Syncing with Firestore database...";
    
    const colRef = collection(db, "books");
    const q = query(colRef, orderBy("savedAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
      readingList = [];
      savedBookKeys.clear();
      
      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        item.docId = docSnap.id;
        readingList.push(item);
        savedBookKeys.add(item.id);
      });
      
      renderReadingListContainer();
      updateStats();
      statusEl.textContent = "Real-time sync connection active.";
    }, (err) => {
      console.error("Firestore onSnapshot sync failed:", err);
      statusEl.textContent = "Firestore sync failure, switching to Local Mode.";
      isFirebaseActive = false;
      updateDbStatusTray();
      loadReadingList();
    });
  } else {
    statusEl.textContent = "Loading offline cyber-archives...";
    onLocalListUpdate();
  }
}

// Local mode handler
function onLocalListUpdate() {
  const localBooks = JSON.parse(localStorage.getItem("books95") || "[]");
  
  localBooks.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  
  readingList = localBooks.map((item, idx) => {
    item.docId = idx.toString();
    return item;
  });
  
  savedBookKeys.clear();
  readingList.forEach(item => savedBookKeys.add(item.id));
  
  renderReadingListContainer();
  updateStats();
  
  document.getElementById("list-status").textContent = "Offline cyber-records loaded.";
}

// Status toggle handler
async function toggleStatus(docId, current) {
  const statusEl = document.getElementById("list-status");
  statusEl.textContent = "Updating status...";
  
  const targetStatus = current === "read" ? "want" : "read";
  
  try {
    if (isFirebaseActive) {
      const docRef = doc(db, "books", docId);
      await updateDoc(docRef, { status: targetStatus });
    } else {
      const localBooks = JSON.parse(localStorage.getItem("books95") || "[]");
      const bookIdx = parseInt(docId);
      if (!isNaN(bookIdx) && localBooks[bookIdx]) {
        localBooks[bookIdx].status = targetStatus;
        localStorage.setItem("books95", JSON.stringify(localBooks));
        onLocalListUpdate();
      }
    }
  } catch (err) {
    console.error("Toggle status failed:", err);
    statusEl.textContent = "Error updating read status.";
  }
}

// Delete book handler
async function deleteBook(docId) {
  const statusEl = document.getElementById("list-status");
  if (!confirm("Are you sure you want to scrub this entry from cyber-records?")) return;
  
  statusEl.textContent = "Deleting record...";
  
  // Find key to remove from savedBookKeys tracker
  let targetKey = "";
  if (isFirebaseActive) {
    const book = readingList.find(b => b.docId === docId);
    if (book) targetKey = book.id;
  } else {
    const bookIdx = parseInt(docId);
    if (!isNaN(bookIdx) && readingList[bookIdx]) {
      targetKey = readingList[bookIdx].id;
    }
  }
  
  try {
    if (isFirebaseActive) {
      const docRef = doc(db, "books", docId);
      await deleteDoc(docRef);
    } else {
      let localBooks = JSON.parse(localStorage.getItem("books95") || "[]");
      const bookIdx = parseInt(docId);
      
      if (!isNaN(bookIdx)) {
        localBooks.splice(bookIdx, 1);
        localStorage.setItem("books95", JSON.stringify(localBooks));
        onLocalListUpdate();
      }
    }
    
    if (targetKey) {
      savedBookKeys.delete(targetKey);
    }
    
    syncSaveButtonsState();
    
  } catch (err) {
    console.error("Delete book failed:", err);
    statusEl.textContent = "Error purging record.";
  }
}

// Keep the Save buttons in search window correctly state-synced on deletion
function syncSaveButtonsState() {
  const saveButtons = document.querySelectorAll(".search-results-viewport .save-btn");
  saveButtons.forEach(btn => {
    const workId = btn.dataset.workId;
    if (!savedBookKeys.has(workId)) {
      btn.className = "win95-btn win95-raised save-btn";
      btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i><span>Save</span>`;
      btn.disabled = false;
    }
  });
}

// Renders the HTML string for a single reading list table row
function renderListItem(book) {
  const coverSrc = book.coverId 
    ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg` 
    : "";
    
  const isRead = book.status === "read";

  return `
    <tr class="list-row" data-id="${escapeHTML(book.id)}">
      <td class="list-cell cover">
        <div class="list-cell-cover-container">
          ${coverSrc 
            ? `<img class="list-cell-cover-img" src="${coverSrc}" alt="${escapeHTML(book.title)}" loading="lazy">` 
            : `<i class="fa-solid fa-book-skull" style="color:var(--win-grey-dark); font-size:14px;"></i>`
          }
        </div>
      </td>
      <td class="list-cell title" title="${escapeHTML(book.title)}">${escapeHTML(book.title)}</td>
      <td class="list-cell author" title="${escapeHTML(book.author)}">${escapeHTML(book.author)}</td>
      <td class="list-cell year">${book.year || "-"}</td>
      <td class="list-cell actions">
        <button class="win95-btn win95-raised toggle-status-btn ${isRead ? 'read' : 'want'}" 
                data-doc-id="${escapeHTML(book.docId)}" 
                data-status="${escapeHTML(book.status)}">
          <i class="fa-solid ${isRead ? 'fa-square-check' : 'fa-square'}"></i>
          <span>${isRead ? 'Read' : 'Want to Read'}</span>
        </button>
        <button class="win95-btn win95-raised delete-btn" 
                data-doc-id="${escapeHTML(book.docId)}">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>
  `;
}

// Renders the overall list inside reading-list-viewport
function renderReadingListContainer() {
  const filterVal = document.getElementById("list-filter-select").value;
  const container = document.getElementById("reading-list-container");
  
  if (!container) return;
  
  const filteredList = readingList.filter(book => {
    if (filterVal === "all") return true;
    return book.status === filterVal;
  });
  
  if (filteredList.length === 0) {
    container.innerHTML = `
      <div class="empty-list">
        <i class="fa-solid fa-ghost"></i>
        <p>No books matching the selected filter state.</p>
        <button class="win95-btn win95-raised" onclick="document.getElementById('icon-search').dispatchEvent(new Event('dblclick'))">
          Find Books
        </button>
      </div>
    `;
    return;
  }
  
  let tableHtml = `
    <table class="list-table-container">
      <thead class="list-table-header">
        <tr style="display:contents;">
          <th class="list-header-cell">Cover</th>
          <th class="list-header-cell">Book Title</th>
          <th class="list-header-cell">Author</th>
          <th class="list-header-cell">Year</th>
          <th class="list-header-cell">Cyber-Logs / Action</th>
        </tr>
      </thead>
      <tbody id="list-table-body" style="display:contents;">
  `;
  
  filteredList.forEach(book => {
    tableHtml += renderListItem(book);
  });
  
  tableHtml += `
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHtml;
  
  // Register item action event listeners
  container.querySelectorAll(".toggle-status-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      toggleStatus(btn.dataset.docId, btn.dataset.status);
    });
  });
  
  container.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteBook(btn.dataset.docId);
    });
  });
}

function updateStats() {
  let read = 0;
  let want = 0;
  
  readingList.forEach(book => {
    if (book.status === "read") read++;
    else want++;
  });
  
  const rStats = document.getElementById("stats-read");
  const wStats = document.getElementById("stats-want");
  
  if (rStats) rStats.textContent = read;
  if (wStats) wStats.textContent = want;
}

/* ==========================================================================
   Helper Utilities & Sanitizers
   ========================================================================== */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/* ==========================================================================
   Global Event Handlers Setup
   ========================================================================== */
window.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  runBootScreen();
  
  document.querySelectorAll(".desktop-icon").forEach(icon => {
    icon.addEventListener("dblclick", () => {
      showWindow(icon.dataset.window);
    });
    
    let lastTap = 0;
    icon.addEventListener("touchend", () => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 300 && tapLength > 0) {
        showWindow(icon.dataset.window);
      }
      lastTap = currentTime;
    });
  });
  
  document.getElementById("start-button").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleStartMenu();
  });
  
  document.querySelectorAll(".start-menu-item").forEach(item => {
    item.addEventListener("click", () => {
      toggleStartMenu(false);
      
      const windowId = item.dataset.window;
      if (windowId) {
        showWindow(windowId);
      }
    });
  });
  
  document.querySelectorAll('#about-window [data-action="close"]').forEach(btn => {
    btn.addEventListener("click", () => {
      closeWindow("about-window");
    });
  });
  
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-submit");
  
  if (searchInput && searchBtn) {
    searchBtn.addEventListener("click", () => {
      searchBooks(searchInput.value);
    });
    
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        searchBooks(searchInput.value);
      }
    });
  }
  
  const filterSelect = document.getElementById("list-filter-select");
  if (filterSelect) {
    filterSelect.addEventListener("change", () => {
      renderReadingListContainer();
    });
  }
  
  const shutdownBtn = document.getElementById("start-menu-shutdown");
  const rebootBtn = document.getElementById("reboot-btn");
  const shutdownOverlay = document.getElementById("shutdown-overlay");
  
  if (shutdownBtn) {
    shutdownBtn.addEventListener("click", () => {
      toggleStartMenu(false);
      shutdownOverlay.classList.remove("hidden");
    });
  }
  
  if (rebootBtn) {
    rebootBtn.addEventListener("click", () => {
      shutdownOverlay.classList.add("hidden");
      window.location.reload();
    });
  }
  
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dismissBootScreen();
    }
  });
  
  const skipBtn = document.getElementById("skip-boot-btn");
  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      dismissBootScreen();
    });
  }
});
