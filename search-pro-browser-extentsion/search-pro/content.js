(() => {
  if (window.__GLASS_SEARCH_EXTENSION__) return;
  window.__GLASS_SEARCH_EXTENSION__ = true;

  const DEFAULT_ENGINES = {
      Google: {
          url: 'https://www.google.com/search?q={q}',
          icon: 'https://www.google.com/favicon.ico'
      },
      ChatGPT: {
          url: 'https://chat.openai.com/?q={q}',
          icon: 'https://cdn.openai.com/favicon.ico'
      },
      YouTube: {
          url: 'https://www.youtube.com/results?search_query={q}',
          icon: 'https://www.youtube.com/favicon.ico'
      },
      GitHub: {
          url: 'https://github.com/search?q={q}',
          icon: 'https://github.com/favicon.ico'
      },
      Bing: {
          url: 'https://www.bing.com/search?q={q}',
          icon: 'https://www.bing.com/favicon.ico'
      },
      DuckDuckGo: {
          url: 'https://duckduckgo.com/?q={q}',
          icon: 'https://duckduckgo.com/favicon.ico'
      },
      Twitter: {
          url: 'https://twitter.com/search?q={q}',
          icon: 'https://abs.twimg.com/favicons/twitter.ico'
      },
      Reddit: {
          url: 'https://www.reddit.com/search/?q={q}',
          icon: 'https://www.reddit.com/favicon.ico'
      }
  };

  // Helper function to safely use Chrome storage API
  const safeStorageSet = (data, callback) => {
      if (chrome.storage && chrome.storage.local) {
          chrome.storage.local.set(data, callback || (() => {}));
      } else {
          console.warn('Chrome storage API not available');
          if (callback) callback();
      }
  };

  class GlassSearch {
        constructor() {
                this.isVisible = false;
                this.selectedEngine = 'Google';
                this.customEngines = [];
                this.searchHistory = [];
                this.shadowHost = null;
                this.shadow = null;
                this.container = null;
                this.isMoreOptionsVisible = false;
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

          toggleMoreOptions() {
              this.isMoreOptionsVisible = !this.isMoreOptionsVisible;
              this.updateMoreOptionsVisibility();
          }

          updateMoreOptionsVisibility() {
              const moreOptionsContainer = this.container.querySelector('.more-options-container');
              const moreOptionsButton = this.container.querySelector('.more-options-button');
              
              if (moreOptionsContainer) {
                  moreOptionsContainer.style.height = this.isMoreOptionsVisible ? 'auto' : '0';
                  moreOptionsContainer.style.opacity = this.isMoreOptionsVisible ? '1' : '0';
                  moreOptionsContainer.style.pointerEvents = this.isMoreOptionsVisible ? 'auto' : 'none';
              }
              
              if (moreOptionsButton) {
                  moreOptionsButton.classList.toggle('expanded', this.isMoreOptionsVisible);
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
                  overflow: hidden;
              }
              .more-options-button {
                  width: 100%;
                  background: rgba(30, 35, 70, 0);
                  border: none;
                  border-radius: 50px 0 50px 0;
                  color: rgba(195, 223, 186, 0.8);
                  cursor: pointer;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  font-weight: 500;
                  position: relative;
                  overflow: hidden;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 3px;
                  backdrop-filter: blur(10px);
                  outline: none;
              }
              .more-options-button:hover {
                  background: rgba(60, 70, 120, 0.51);
                  border-color: rgba(255, 255, 255, 0);
                  transform: translateY(-2px) scale(1.02);
                  box-shadow: 0 8px 25px rgba(100, 150, 255, 0.2);
                  color: rgba(255, 255, 255, 1);
              }
              .more-options-button:active {
                  transform: translateY(-1px) scale(1.01);
              }
              .more-options-button.expanded {
                  background: rgba(70, 80, 140, 0);
                  border-color: rgba(100, 149, 255, 0);
                  color: rgba(255, 255, 255, 1);
              }
              .more-options-button::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: -100%;
                  width: 100%;
                  height: 100%;
                  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                  transition: left 0.5s ease;
              }
              .more-options-button:hover::before {
                  left: 100%;
              }
              .more-options-icon {
                  transition: transform 0.3s ease;
                  font-size: 16px;
              }
              .more-options-button.expanded .more-options-icon {
                  transform: rotate(180deg);
              }
              .more-options-container {
                  overflow: hidden;
                  transition: height 0.3s ease, opacity 0.3s ease, pointer-events 0.3s ease;
                  height: 0;
                  opacity: 0;
                  pointer-events: none;
                  padding: 0px 20px;
              }
              .glass-container {
                  position: absolute;
                  top: 20%;
                  left: 50%;
                  transform: translateX(-50%) scale(0.95);
                  width: min(95vw, 650px);
                  background: rgba(2, 7, 23, 0.9);
                  border-radius: 30px;
                  border: 1px solid rgba(37, 37, 37, 0.2);
                  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
                  padding: 0px;
                  color: rgba(255, 255, 255, 0.95);
                  font-family: 'Inter', sans-serif;
                  z-index: 2147483647;
                  opacity: 0;
                  pointer-events: none;
                  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                  display: block;
                  backdrop-filter: blur(10px) saturate(100%);
              }
              .search-bar-section {
                  margin-bottom: 0;
              }
              .glass-container.visible {
                  opacity: 1;
                  pointer-events: auto;
                  transform: translateX(-50%) scale(1);
                  animation: slideInBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
              }
              @keyframes slideInBounce {
                  0% {
                      opacity: 0;
                      transform: translateX(-50%) translateY(-100px) scale(0.8);
                  }
                  50% {
                      opacity: 0.8;
                      transform: translateX(-50%) translateY(10px) scale(1.05);
                  }
                  100% {
                      opacity: 1;
                      transform: translateX(-50%) translateY(0) scale(1);
                  }
              }
              .drag-handle {
                  position: absolute;
                  top: 8px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 48px;
                  height: 4px;
                  background: rgba(255, 255, 255, 0.15);
                  border-radius: 2px;
                  cursor: move;
              }
              .header {
                  margin-bottom: 0px;
                  display: flex;
                  height: 60px;
              }
              .search-box {
                  display: flex;
                  width: 100%;
              }
              .engine-select {
                  width: 15%;
                  height: 100%;
                  padding: 10px 6px;
                  background: rgb(59 60 83 / 39%);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 80px 0px 0px 80px;
                  color: inherit;
                  font-size: 14px;
                  appearance: none;
                  background-position: right 6px center;
                  background-repeat: no-repeat;
                  transition: all 0.3s ease;
                  text-indent: 20px;
                  background-size: 12px, 16px 16px;
                  background-position: right 6px center, 6px center;
                  outline: none;
              }
              .engine-select option {
                  background: #333;
                  color: white;
                  padding: 8px;
                  display: flex;
                  align-items: center;
                  padding: 8px 12px;
                  border: none;
                  border-radius: 10px;
              }
              .search-input {
                  flex: 1;
                  padding: 12px 20px;
                  background: rgba(255, 255, 255, 0.05);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-left: none;
                  color: inherit;
                  font-size: 18px;
                  transition: all 0.3s ease;
              }
              .search-input:focus {
                  outline: none;
                //   border-color: rgba(255, 255, 255, 0.4);
                  background: rgba(255, 255, 255, 0.1);
                  box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
              }
              .search-button {
                  padding: 12px 22px;
                  background: rgba(255, 255, 255, 0.1);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 0px 80px 80px 0px;
                  color: inherit;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  font-size: 18px;
                  font-weight: bold;
                  height: 100%;
              }
              .search-button:hover {
                  background: rgba(255, 255, 255, 0.2);
                  transform: translateY(-2px);
                  box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
              }
              .search-button:active {
                  transform: translateY(0px);
              }
              .engines-section, .history-section {
                  margin-bottom: 24px;
              }
              .engines-section {
                  margin-top: 24px;
              }
              .history-section {
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
              }
              .history-header {
                  display: flex;
                  justify-content: space-between;
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
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  position: relative;
                  overflow: hidden;
              }
              .engine-button:active, .custom-engine-button:active {
                  transform: translateY(-1px) scale(1.02);
              }
              .engine-button.icon-only {
                  width: 40px;
                  height: 40px;
              }
              .engine-button::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: -100%;
                  width: 100%;
                  height: 100%;
                  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                  transition: left 0.5s;
              }
              .engine-icon {
                  width: 20px;
                  height: 20px;
                  border-radius: 3px;
                  transition: all 0.3s ease;
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
                  padding: 10px 20px;
                  background: rgba(255, 255, 255, 0.1);
                  border: none;
                  border-radius: 12px;
                  color: inherit;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  font-weight: 500;
                  position: relative;
                  overflow: hidden;
              }
              .add-button:hover {
                  background: rgba(255, 255, 255, 0.2);
                  transform: translateY(-2px);
                  box-shadow: 0 5px 15px rgba(255, 255, 255, 0.1);
              }
              .add-button:active {
                  transform: translateY(0px);
              }
              .add-button::before {
                  content: '';
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  width: 0;
                  height: 0;
                  background: rgba(255, 255, 255, 0.2);
                  border-radius: 50%;
                  transform: translate(-50%, -50%);
                  transition: width 0.3s, height 0.3s;
              }
              .add-button:hover::before {
                  width: 200px;
                  height: 200px;
              }
              .modal-overlay {
                  position: fixed;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: rgba(0, 0, 0, 0.5);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  z-index: 2147483648;
                  opacity: 0;
                  visibility: hidden;
                  transition: opacity 0.3s ease, visibility 0.3s ease;
              }
              .modal-overlay.visible {
                  opacity: 1;
                  visibility: visible;
              }
              .modal-content {
                  background: rgba(2, 7, 23, 0.95);
                  padding: 24px;
                  border-radius: 20px;
                  border: 1px solid rgba(37, 37, 37, 0.3);
                  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
                  backdrop-filter: blur(20px) saturate(120%);
                  width: min(90vw, 400px);
                  transform: scale(0.95);
                  transition: transform 0.3s ease;
                  color: rgba(255, 255, 255, 0.95);
              }
              .modal-overlay.visible .modal-content {
                  transform: scale(1);
              }
              .modal-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 20px;
                  padding-bottom: 16px;
                  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              }
              .modal-title {
                  font-size: 18px;
                  font-weight: 600;
                  margin: 0;
                  color: rgba(255, 255, 255, 0.95);
              }
              .modal-close {
                  background: rgba(255, 255, 255, 0.1);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  color: rgba(255, 255, 255, 0.8);
                  font-size: 18px;
                  cursor: pointer;
                  padding: 8px;
                  width: 32px;
                  height: 32px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border-radius: 8px;
                  transition: all 0.3s ease;
              }
              .modal-close:hover {
                  background: rgba(255, 255, 255, 0.2);
                  border-color: rgba(255, 255, 255, 0.2);
                  color: rgba(255, 255, 255, 1);
                  transform: translateY(-1px);
              }
              .add-form {
                  display: flex;
                  flex-direction: column;
                  gap: 16px;
              }
              .name-input, .url-input {
                  width: 100%;
                  padding: 12px 16px;
                  margin-bottom: 12px;
                  background: rgba(255, 255, 255, 0.05);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 10px;
                  color: rgba(255, 255, 255, 0.9);
                  font-size: 14px;
                  font-family: 'Inter', sans-serif;
                  transition: all 0.3s ease;
                  outline: none;
              }
              .name-input:focus, .url-input:focus {
                  background: rgba(255, 255, 255, 0.1);
                  border-color: rgba(255, 255, 255, 0.3);
                  box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
              }
              .name-input::placeholder, .url-input::placeholder {
                  color: rgba(255, 255, 255, 0.5);
              }
              .form-actions {
                  display: flex;
                  gap: 12px;
                  justify-content: flex-end;
                  margin-top: 20px;
              }
              .cancel-button, .save-button {
                  padding: 10px 20px;
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 500;
                  transition: all 0.3s ease;
                  font-family: 'Inter', sans-serif;
              }
              .cancel-button {
                  background: rgba(255, 255, 255, 0.05);
                  color: rgba(255, 255, 255, 0.8);
              }
              .cancel-button:hover {
                  background: rgba(255, 255, 255, 0.1);
                  border-color: rgba(255, 255, 255, 0.2);
                  color: rgba(255, 255, 255, 1);
              }
              .save-button {
                  background: rgba(255, 255, 255, 0.15);
                  color: rgba(255, 255, 255, 0.9);
              }
              .save-button:hover {
                  background: rgba(255, 255, 255, 0.25);
                  border-color: rgba(255, 255, 255, 0.3);
                  color: rgba(255, 255, 255, 1);
                  transform: translateY(-1px);
                  box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
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
              <div class="search-bar-section">
                  <div class="header">
                      <p hidden>Made by PES2UG23CS363 NANDAN D.</p>
                      <div class="search-box">
                          <select class="engine-select"></select>
                          <input type="text" class="search-input" placeholder="Search ${this.selectedEngine}..." autofocus>
                          <button class="search-button">→</button>
                      </div>
                  </div>
                  <button class="more-options-button">
                      <span class="more-options-icon">▼</span>
                  </button>
              </div>
              <div class="more-options-container">
                  <div class="engines-section">
                      <h3>Search Engines</h3>
                      <div class="engine-list"></div>
                      <div class="custom-engines"></div>
                      <button class="add-button">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M12 5v14M5 12h14"></path>
                          </svg>
                          Add
                      </button>
                  </div>
                  <div class="history-section">
                    <div class="history-header">
                        <h3>Recent Searches</h3>
                        <button class="clear-button">Clear All</button>
                    </div>
                  <div class="history-list"></div>
              </div>
              </div>
              <div class="modal-overlay">
                  <div class="modal-content">
                      <div class="modal-header">
                          <h3 class="modal-title">Add Custom Engine</h3>
                          <button class="modal-close">&times;</button>
                      </div>
                      <div class="add-form">
                          <input type="text" class="name-input" placeholder="Engine Name">
                          <input type="url" class="url-input" placeholder="https://example.com/search?q={q}">
                          <div class="form-actions">
                              <button class="cancel-button">Cancel</button>
                              <button class="save-button">Save</button>
                          </div>
                      </div>
                  </div>
              </div>
          `;
      }

      async loadStorage() {
          try {
              if (chrome.storage && chrome.storage.local) {
                  const data = await chrome.storage.local.get(['selectedEngine', 'customEngines', 'searchHistory']);
                  this.selectedEngine = data.selectedEngine || 'Google';
                  this.customEngines = data.customEngines || [];
                  this.searchHistory = data.searchHistory || [];
              } else {
                  console.warn('Chrome storage API not available, using defaults');
                  this.selectedEngine = 'Google';
                  this.customEngines = [];
                  this.searchHistory = [];
              }
              this.updateUI();
          } catch (error) {
              console.error('Failed to load storage:', error);
          }
      }

      updateUI() {
          try {
              const select = this.container.querySelector('.engine-select');
              select.innerHTML = `
                  ${Object.entries(DEFAULT_ENGINES).map(([name, { icon }]) => `
                      <option value="${name}" data-icon="${icon}">${name}</option>
                  `).join('')}
                  ${this.customEngines.map(engine => `
                      <option value="${engine.name}">${engine.name}</option>
                  `).join('')}
              `;
              
              // Update select background to show selected engine icon
              const updateSelectIcon = () => {
                  const selectedOption = select.options[select.selectedIndex];
                  const iconUrl = selectedOption.getAttribute('data-icon');
                  if (iconUrl) {
                      select.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>'), url('${iconUrl}')`;
                  } else {
                      select.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>')`;
                  }
              };
              
              select.addEventListener('change', updateSelectIcon);
              updateSelectIcon();
              select.value = this.selectedEngine;

              const input = this.container.querySelector('.search-input');
              input.placeholder = `Search ${this.selectedEngine}...`;

              const engineList = this.container.querySelector('.engine-list');
              engineList.innerHTML = Object.entries(DEFAULT_ENGINES).map(([name, { icon }]) => `
                  <button class="engine-button icon-only" data-engine="${name}" title="${name}">
                      <img src="${icon}" alt="${name}" class="engine-icon" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik0xMiAydjZtMCA4djZtLTEwLTEwaDZtOCAwaDYiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+'"/>
                  </button>
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

          } catch (error) {
              console.error('Failed to update UI:', error);
          }
          }

          bindEvents() {
              const moreOptionsButton = this.container.querySelector('.more-options-button');
              moreOptionsButton.addEventListener('click', () => {
                  this.toggleMoreOptions();
              });
              
              try {
                  const select = this.container.querySelector('.engine-select');
                  select.addEventListener('change', (e) => {
                      this.selectedEngine = e.target.value;
                      safeStorageSet({ selectedEngine: this.selectedEngine }, () => {
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


              const addButton = this.container.querySelector('.add-button');
              const modalOverlay = this.container.querySelector('.modal-overlay');
              const nameInput = this.container.querySelector('.name-input');
              const urlInput = this.container.querySelector('.url-input');
              const saveButton = this.container.querySelector('.save-button');
              const cancelButton = this.container.querySelector('.cancel-button');
              const moreOptionsContainer = this.container.querySelector('.more-options-container');
              const enginesSection = this.container.querySelector('.engines-section');

              let editingEngine = null;
              
              const closeModal = () => {
                  modalOverlay.classList.remove('visible');
                  nameInput.value = '';
                  urlInput.value = '';
                  editingEngine = null;
              };

              addButton.addEventListener('click', () => {
                  editingEngine = null;
                  nameInput.value = '';
                  urlInput.value = '';
                  modalOverlay.classList.add('visible');
                  nameInput.focus();
              });

              cancelButton.addEventListener('click', closeModal);

              const modalCloseButton = this.container.querySelector('.modal-close');
              modalCloseButton.addEventListener('click', closeModal);

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
                  safeStorageSet({ customEngines: this.customEngines }, () => {
                      this.updateUI();
                      closeModal();
                      nameInput.value = '';
                      urlInput.value = '';
                      editingEngine = null;
                  });
              });

              this.container.addEventListener('click', (e) => {
                  if (e.target.classList.contains('engine-button') || e.target.closest('.engine-button')) {
                      const button = e.target.classList.contains('engine-button') ? e.target : e.target.closest('.engine-button');
                      this.selectedEngine = button.dataset.engine;
                      select.value = this.selectedEngine;
                      safeStorageSet({ selectedEngine: this.selectedEngine }, () => {
                          this.updateUI();
                      });
                  }
                  if (e.target.classList.contains('custom-engine-button')) {
                      this.selectedEngine = e.target.dataset.name;
                      select.value = this.selectedEngine;
                      safeStorageSet({ selectedEngine: this.selectedEngine }, () => {
                          this.updateUI();
                      });
                  }
                  if (e.target.classList.contains('edit-button')) {
                      const name = e.target.dataset.name;
                      editingEngine = this.customEngines.find(e => e.name === name);
                      if (editingEngine) {
                          nameInput.value = editingEngine.name;
                          urlInput.value = editingEngine.url;
                      modalOverlay.classList.add('visible');
                      nameInput.focus();
                      }
                  }
                  if (e.target.classList.contains('delete-button')) {
                      const name = e.target.dataset.name;
                      this.customEngines = this.customEngines.filter(e => e.name !== name);
                      safeStorageSet({ customEngines: this.customEngines }, () => {
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
                      safeStorageSet({ searchHistory: this.searchHistory }, () => {
                          this.updateUI();
                      });
                  }
                  e.stopPropagation();
              });

              const clearButton = this.container.querySelector('.clear-button');
              clearButton.addEventListener('click', () => {
                  this.searchHistory = [];
                  safeStorageSet({ searchHistory: [] }, () => {
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
                  safeStorageSet({ searchHistory: this.searchHistory }, () => {
                      this.updateUI();
                  });
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
              } else {
                  document.removeEventListener('click', this.handleOutsideClick, { capture: true });
              }
          } catch (error) {
              console.error('Toggle UI failed:', error);
          }
      }

      handleOutsideClick = (e) => {
          const isInside = e.composedPath().includes(this.shadowHost);
          if (!isInside && this.isVisible) {
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
                  searchInstance.toggleUI();
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
