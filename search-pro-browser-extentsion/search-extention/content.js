(() => {
  if (window.__GLASS_SEARCH_EXTENSION__) return;
  window.__GLASS_SEARCH_EXTENSION__ = true;

  const DEFAULT_ENGINES = {
      Google: {
          url: 'https://www.google.com/search?q={q}',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v6m0 8v6m-10-10h6m8 0h6"/></svg>`
      },
      ChatGPT: {
          url: 'https://chat.openai.com/?q={q}',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/></svg>`
      },
      YouTube: {
          url: 'https://www.youtube.com/results?search_query={q}',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>`
      },
      GitHub: {
          url: 'https://github.com/search?q={q}',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`
      }
  };

  class GlassSearch {
      constructor() {
          this.isVisible = false;
          this.isPinned = false;
          this.selectedEngine = 'Google';
          this.customEngines = [];
          this.searchHistory = [];
          this.shadowHost = null;
          this.shadow = null;
          this.container = null;
          try {
              this.init();
          } catch (error) {
              console.error('Constructor failed:', error);
          }
      }

      init() {
          this.shadowHost = document.createElement('div');
          this.shadowHost.id = 'glass-search-host';
          this.shadowHost.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              pointer-events: none;
              z-index: 2147483647;
          `;
          try {
              document.body.appendChild(this.shadowHost);
          } catch (error) {
              console.error('Failed to append shadow host:', error);
              return;
          }
          this.shadow = this.shadowHost.attachShadow({ mode: 'open' });
          this.container = document.createElement('div');
          this.container.className = 'glass-container';
          this.shadow.appendChild(this.container);

          try {
              this.initUI();
              this.loadStorage();
              this.bindEvents();
              this.initDrag();
          } catch (error) {
              console.error('Initialization failed:', error);
          }
      }

      initUI() {
          const fontLink = document.createElement('link');
          fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
          fontLink.rel = 'stylesheet';
          this.shadow.appendChild(fontLink);

          const style = document.createElement('style');
          style.textContent = `
              .glass-container {
                  position: absolute;
                  top: 20%;
                  left: 50%;
                  transform: translateX(-50%) scale(0.95);
                  width: min(90vw, 480px);
                  background: rgba(55, 55, 55, 0.6);
                  border-radius: 30px;
                  border: 1px solid rgba(255, 255, 255, 0.2);
                  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
                  padding: 24px;
                  color: rgba(255, 255, 255, 0.9);
                  font-family: 'Inter', sans-serif;
                  z-index: 2147483647;
                  opacity: 0;
                  pointer-events: none;
                  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  display: block;
                  backdrop-filter: blur(30px) saturate(300%);
              }
              .glass-container.visible {
                  opacity: 1;
                  pointer-events: auto;
                  transform: translateX(-50%) scale(1);
              }
              .drag-handle {
                  position: absolute;
                  top: 12px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 48px;
                  height: 4px;
                  background: rgba(255, 255, 255, 0.15);
                  border-radius: 2px;
                  cursor: move;
              }
              .pin-button {
                  position: absolute;
                  top: 12px;
                  right: 12px;
                  padding: 8px;
                  background: rgba(255, 255, 255, 0.1);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 50%;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  transition: background 0.2s ease;
              }
              .pin-button:hover {
                  background: rgba(255, 255, 255, 0.15);
              }
              .pin-button.pinned svg {
                  fill: rgba(255, 255, 255, 0.9);
              }
              .header {
                  margin-bottom: 24px;
                  display: flex;
                  height: 45px;
              }
              .search-box {
                  display: flex;
                  width: 100%;
              }
              .engine-select {
                  width: 20%;
                  height: 100%;
                  padding: 10px 6px;
                  background: rgba(255, 255, 255, 0.05);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 80px 0px 0px 80px;
                  color: inherit;
                  font-size: 14px;
                  appearance: none;
                  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>');
                  background-position: right 6px center;
                  background-repeat: no-repeat;
              }
              .search-input {
                  flex: 1;
                  padding: 12px 16px;
                  background: rgba(255, 255, 255, 0.05);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-left: none;
                  color: inherit;
                  font-size: 16px;
                  transition: border-color 0.2s ease;
              }
              .search-input:focus {
                  outline: none;
                  border-color: rgba(255, 255, 255, 0.3);
              }
              .search-button {
                  padding: 12px 18px;
                  background: rgba(255, 255, 255, 0.1);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 0px 80px 80px 0px;
                  color: inherit;
                  cursor: pointer;
                  transition: background 0.2s ease;
              }
              .search-button:hover {
                  background: rgba(255, 255, 255, 0.15);
              }
              .engines-section, .history-section {
                  margin-bottom: 24px;
              }
              .history-section {
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
              }
              h3 {
                  font-size: 16px;
                  font-weight: 500;
                  margin: 0 0 12px 0;
                  color: #ffffff;
              }
              .engine-list {
                  display: grid;
                  grid-template-columns: repeat(auto-fill, 40px);
                  gap: 8px;
                  margin-bottom: 12px;
              }
              .custom-engines {
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
              }
              .engine-button, .custom-engine-button {
                  padding: 8px;
                  background: rgba(255, 255, 255, 0.1);
                  border: none;
                  border-radius: 10px;
                  color: inherit;
                  cursor: pointer;
                  transition: background 0.2s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
              }
              .engine-button:hover, .custom-engine-button:hover {
                  background: rgba(255, 255, 255, 0.15);
              }
              .engine-button.icon-only {
                  width: 40px;
                  height: 40px;
              }
              .custom-engine-button {
                  padding: 8px 16px;
                  justify-content: flex-start;
                  width: 100%;
              }
              .engine-item {
                  display: flex;
                  align-items: center;
                  gap: 8px;
              }
              .edit-button, .delete-button {
                  background: none;
                  border: none;
                  color: rgba(255, 100, 100, 0.8);
                  cursor: pointer;
                  font-size: 14px;
                  padding: 8px;
                  transition: color 0.2s ease;
              }
              .edit-button:hover, .delete-button:hover {
                  color: rgba(255, 100, 100, 1);
              }
              .add-button {
                  padding: 8px 16px;
                  background: rgba(255, 255, 255, 0.1);
                  border: none;
                  border-radius: 10px;
                  color: inherit;
                  cursor: pointer;
                  transition: background 0.2s ease;
              }
              .add-button:hover {
                  background: rgba(255, 255, 255, 0.15);
              }
              .add-form {
                  margin-top: 12px;
                  padding: 12px;
                  background: rgba(255, 255, 255, 0.05);
                  border-radius: 12px;
              }
              .add-form.hidden {
                  display: none;
              }
              .name-input, .url-input {
                  width: 100%;
                  padding: 10px 12px;
                  margin-bottom: 10px;
                  background: rgba(255, 255, 255, 0.05);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 8px;
                  color: inherit;
                  font-size: 14px;
              }
              .form-actions {
                  display: flex;
                  gap: 8px;
                  justify-content: flex-end;
              }
              .cancel-button, .save-button {
                  padding: 8px 16px;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 14px;
              }
              .cancel-button {
                  background: rgba(255, 255, 255, 0.1);
                  color: inherit;
              }
              .save-button {
                  background: rgba(255, 255, 255, 0.2);
                  color: inherit;
              }
              .history-list {
                  max-height: 120px;
                  overflow-y: auto;
                  width: 100%;
              }
              .history-item {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 8px 12px;
                  background: rgba(255, 255, 255, 0.03);
                  border-radius: 8px;
                  margin: 4px 0;
                  cursor: pointer;
                  font-size: 14px;
                  transition: background 0.2s ease;
              }
              .history-item:hover {
                  background: rgba(255, 255, 255, 0.08);
              }
              .delete-history {
                  background: none;
                  border: none;
                  color: rgba(255, 100, 100, 0.8);
                  cursor: pointer;
                  font-size: 14px;
              }
              .delete-history:hover {
                  color: rgba(255, 100, 100, 1);
              }
              .clear-button {
                  background: rgba(255, 255, 255, 0.1);
                  border: none;
                  border-radius: 80px;
                  padding: 6px 12px;
                  color: inherit;
                  cursor: pointer;
                  font-size: 12px;
                  align-self: flex-end;
                  transition: background 0.2s ease;
              }
              .clear-button:hover {
                  background: rgba(255, 255, 255, 0.15);
              }
          `;
          this.shadow.appendChild(style);

          this.container.innerHTML = `
              <div class="drag-handle"></div>
              <button class="pin-button" title="Pin UI">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </button>
              <div class="header">
                  <p hidden>Made by PES2UG23CS363 NANDAN D.</p>
                  <div class="search-box">
                      <select class="engine-select"></select>
                      <input type="text" class="search-input" placeholder="Search ${this.selectedEngine}..." autofocus>
                      <button class="search-button">→</button>
                  </div>
              </div>
              <div class="engines-section">
                  <h3>Search Engines</h3>
                  <div class="engine-list"></div>
                  <div class="custom-engines"></div>
                  <button class="add-button">+ Add Custom Engine</button>
                  <div class="add-form hidden">
                      <input type="text" class="name-input" placeholder="Engine Name">
                      <input type="url" class="url-input" placeholder="https://example.com/search?q={q}">
                      <div class="form-actions">
                          <button class="cancel-button">Cancel</button>
                          <button class="save-button">Save</button>
                      </div>
                  </div>
              </div>
              <div class="history-section">
                  <h3>Recent Searches</h3>
                  <button class="clear-button">Clear All</button>
                  <div class="history-list"></div>
              </div>
          `;
      }

      async loadStorage() {
          try {
              const data = await chrome.storage.local.get(['selectedEngine', 'customEngines', 'searchHistory', 'isPinned']);
              this.selectedEngine = data.selectedEngine || 'Google';
              this.customEngines = data.customEngines || [];
              this.searchHistory = data.searchHistory || [];
              this.isPinned = data.isPinned || false;
              this.updateUI();
              if (this.isPinned) this.toggleUI(true);
          } catch (error) {
              console.error('Failed to load storage:', error);
          }
      }

      updateUI() {
          try {
              const select = this.container.querySelector('.engine-select');
              select.innerHTML = `
                  ${Object.entries(DEFAULT_ENGINES).map(([name, { icon }]) => `
                      <option value="${name}">${icon}</option>
                  `).join('')}
                  ${this.customEngines.map(engine => `
                      <option value="${engine.name}">${engine.name}</option>
                  `).join('')}
              `;
              select.value = this.selectedEngine;

              const input = this.container.querySelector('.search-input');
              input.placeholder = `Search ${this.selectedEngine}...`;

              const engineList = this.container.querySelector('.engine-list');
              engineList.innerHTML = Object.entries(DEFAULT_ENGINES).map(([name, { icon }]) => `
                  <button class="engine-button icon-only" data-engine="${name}" title="${name}">${icon}</button>
              `).join('');

              const customEngines = this.container.querySelector('.custom-engines');
              customEngines.innerHTML = this.customEngines.map(engine => `
                  <div class="engine-item">
                      <button class="custom-engine-button" data-name="${engine.name}">${engine.name}</button>
                      <button class="edit-button" data-name="${engine.name}">Edit</button>
                      <button class="delete-button" data-name="${engine.name}">Delete</button>
                  </div>
              `).join('');

              const historyList = this.container.querySelector('.history-list');
              historyList.innerHTML = this.searchHistory.map((item, index) => `
                  <div class="history-item" data-index="${index}" data-engine="${item.engine}" data-query="${item.query}">
                      <span>${item.query} <small>(${item.engine})</small></span>
                      <small>${new Date(item.timestamp).toLocaleTimeString()}</small>
                      <button class="delete-history">×</button>
                  </div>
              `).join('');

              const pinButton = this.container.querySelector('.pin-button');
              pinButton.classList.toggle('pinned', this.isPinned);
          } catch (error) {
              console.error('Failed to update UI:', error);
          }
      }

      bindEvents() {
          try {
              const select = this.container.querySelector('.engine-select');
              select.addEventListener('change', (e) => {
                  this.selectedEngine = e.target.value;
                  chrome.storage.local.set({ selectedEngine: this.selectedEngine }, () => {
                      this.updateUI();
                  });
              });

              const searchButton = this.container.querySelector('.search-button');
              searchButton.addEventListener('click', () => {
                  this.performSearch();
              });

              const searchInput = this.container.querySelector('.search-input');
              searchInput.addEventListener('keydown', (e) => {
                  if (e.key === 'Enter') {
                      this.performSearch();
                  }
              });

              const pinButton = this.container.querySelector('.pin-button');
              pinButton.addEventListener('click', () => {
                  this.isPinned = !this.isPinned;
                  chrome.storage.local.set({ isPinned: this.isPinned }, () => {
                      this.updateUI();
                      if (!this.isVisible && this.isPinned) this.toggleUI(true);
                  });
              });

              const addButton = this.container.querySelector('.add-button');
              const addForm = this.container.querySelector('.add-form');
              const nameInput = this.container.querySelector('.name-input');
              const urlInput = this.container.querySelector('.url-input');
              const saveButton = this.container.querySelector('.save-button');
              const cancelButton = this.container.querySelector('.cancel-button');

              let editingEngine = null;

              addButton.addEventListener('click', () => {
                  editingEngine = null;
                  nameInput.value = '';
                  urlInput.value = '';
                  addForm.classList.remove('hidden');
                  nameInput.focus();
              });

              cancelButton.addEventListener('click', () => {
                  addForm.classList.add('hidden');
                  nameInput.value = '';
                  urlInput.value = '';
                  editingEngine = null;
              });

              saveButton.addEventListener('click', () => {
                  const name = nameInput.value.trim();
                  const url = urlInput.value.trim();
                  if (!name || !url) {
                      alert('Name and URL are required.');
                      return;
                  }
                  if (!url.includes('{q}')) {
                      alert('URL must include {q} placeholder.');
                      return;
                  }
                  if (editingEngine) {
                      const index = this.customEngines.findIndex(e => e.name === editingEngine.name);
                      if (index !== -1 && (name !== editingEngine.name && (this.customEngines.some(e => e.name === name) || Object.keys(DEFAULT_ENGINES).includes(name)))) {
                          alert('Engine name already exists.');
                          return;
                      }
                      this.customEngines[index] = { name, url };
                  } else {
                      if (this.customEngines.some(e => e.name === name) || Object.keys(DEFAULT_ENGINES).includes(name)) {
                          alert('Engine name already exists.');
                          return;
                      }
                      this.customEngines.push({ name, url });
                  }
                  chrome.storage.local.set({ customEngines: this.customEngines }, () => {
                      this.updateUI();
                      addForm.classList.add('hidden');
                      nameInput.value = '';
                      urlInput.value = '';
                      editingEngine = null;
                  });
              });

              this.container.addEventListener('click', (e) => {
                  if (e.target.classList.contains('engine-button')) {
                      this.selectedEngine = e.target.dataset.engine;
                      select.value = this.selectedEngine;
                      this.performSearch();
                  }
                  if (e.target.classList.contains('custom-engine-button')) {
                      this.selectedEngine = e.target.dataset.name;
                      select.value = this.selectedEngine;
                      this.performSearch();
                  }
                  if (e.target.classList.contains('edit-button')) {
                      const name = e.target.dataset.name;
                      editingEngine = this.customEngines.find(e => e.name === name);
                      if (editingEngine) {
                          nameInput.value = editingEngine.name;
                          urlInput.value = editingEngine.url;
                          addForm.classList.remove('hidden');
                          nameInput.focus();
                      }
                  }
                  if (e.target.classList.contains('delete-button')) {
                      const name = e.target.dataset.name;
                      this.customEngines = this.customEngines.filter(e => e.name !== name);
                      chrome.storage.local.set({ customEngines: this.customEngines }, () => {
                          this.updateUI();
                      });
                  }
                  if (e.target.classList.contains('history-item') || e.target.closest('.history-item')) {
                      const item = e.target.closest('.history-item');
                      if (!e.target.classList.contains('delete-history')) {
                          this.selectedEngine = item.dataset.engine;
                          select.value = this.selectedEngine;
                          searchInput.value = item.dataset.query;
                          this.updateUI();
                      }
                  }
                  if (e.target.classList.contains('delete-history')) {
                      const index = e.target.parentElement.dataset.index;
                      this.searchHistory.splice(index, 1);
                      chrome.storage.local.set({ searchHistory: this.searchHistory }, () => {
                          this.updateUI();
                      });
                  }
                  e.stopPropagation();
              });

              const clearButton = this.container.querySelector('.clear-button');
              clearButton.addEventListener('click', () => {
                  this.searchHistory = [];
                  chrome.storage.local.set({ searchHistory: [] }, () => {
                      this.updateUI();
                  });
              });
          } catch (error) {
              console.error('Failed to bind events:', error);
          }
      }

      async performSearch() {
          try {
              const query = this.container.querySelector('.search-input').value.trim();
              if (!query) {
                  alert('Please enter a search query.');
                  return;
              }

              let engine = DEFAULT_ENGINES[this.selectedEngine];
              if (!engine) {
                  engine = this.customEngines.find(e => e.name === this.selectedEngine);
              }
              if (engine) {
                  const searchUrl = engine.url.replace('{q}', encodeURIComponent(query));
                  window.open(searchUrl, '_blank');
                  this.searchHistory.unshift({ query, engine: this.selectedEngine, timestamp: Date.now() });
                  if (this.searchHistory.length > 10) this.searchHistory.pop();
                  await chrome.storage.local.set({ searchHistory: this.searchHistory });
                  this.updateUI();
              } else {
                  console.error('Engine not found:', this.selectedEngine);
              }
          } catch (error) {
              console.error('Search failed:', error);
          }
      }

      toggleUI(visible) {
          try {
              if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
                  alert('Please navigate to a webpage (http/https) to use the Glass Search Extension.');
                  return;
              }
              this.isVisible = visible ?? !this.isVisible;
              this.container.classList.toggle('visible', this.isVisible);
              if (this.isVisible) {
                  document.addEventListener('click', this.handleOutsideClick, { capture: true });
                  const input = this.container.querySelector('.search-input');
                  setTimeout(() => input.focus(), 0);
              } else if (!this.isPinned) {
                  document.removeEventListener('click', this.handleOutsideClick, { capture: true });
              }
          } catch (error) {
              console.error('Toggle UI failed:', error);
          }
      }

      handleOutsideClick = (e) => {
          const isInside = e.composedPath().includes(this.shadowHost);
          if (!isInside && this.isVisible && !this.isPinned) {
              this.toggleUI(false);
          }
      };

      initDrag() {
          let isDragging = false;
          let startX, startY, initialX, initialY;

          const dragHandle = this.container.querySelector('.drag-handle');
          dragHandle.addEventListener('mousedown', (e) => {
              isDragging = true;
              startX = e.clientX;
              startY = e.clientY;
              const rect = this.container.getBoundingClientRect();
              initialX = rect.left;
              initialY = rect.top;
          });

          document.addEventListener('mousemove', (e) => {
              if (!isDragging) return;
              const dx = e.clientX - startX;
              const dy = e.clientY - startY;
              this.container.style.left = `${initialX + dx}px`;
              this.container.style.top = `${initialY + dy}px`;
              this.container.style.transform = 'none';
          });

          document.addEventListener('mouseup', () => {
              isDragging = false;
          });
      }

      ping() {
          return true;
      }
  }

  let searchInstance = null;
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          try {
              if (message.action === 'toggle-glass-ui') {
                  if (!searchInstance) {
                      searchInstance = new GlassSearch();
                  }
                  if (!searchInstance.isPinned) {
                      searchInstance.toggleUI();
                  }
                  sendResponse({ status: 'toggled' });
              } else if (message.action === 'ping') {
                  sendResponse({ loaded: !!searchInstance });
              }
          } catch (error) {
              console.error('Message handler failed:', error);
              sendResponse({ error: error.message });
          }
          return true;
      });
  } else {
      console.error('Chrome runtime not available');
  }
})();