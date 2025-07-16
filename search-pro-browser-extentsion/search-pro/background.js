chrome.action.onClicked.addListener(async (tab) => {
  try {
      if (!tab.url?.startsWith('http')) {
          console.error('Extension only works on http/https pages');
          if (chrome.notifications && chrome.notifications.create) {
              chrome.notifications.create({
                  type: 'basic',
                  iconUrl: 'icon.png',
                  title: 'Smart Search Extension',
                  message: 'This extension only works on web pages (http/https). Navigate to a webpage and try again.'
              });
          }
          return;
      }

      console.log('Checking content script for tab:', tab.id);
      const pingContentScript = async (attempts = 3, delay = 300) => {
          for (let i = 0; i < attempts; i++) {
              try {
                  const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                  if (response.loaded) {
                      console.log('Content script loaded');
                      return true;
                  }
              } catch (error) {
                  console.warn(`Ping attempt ${i + 1} failed:`, error.message);
              }
              await new Promise(resolve => setTimeout(resolve, delay));
          }
          return false;
      };

      const isLoaded = await pingContentScript();
      if (!isLoaded) {
          console.error('Content script not loaded, injecting');
          await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
          });
          await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('Sending toggle-glass-ui message to tab:', tab.id);
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggle-glass-ui' });
      console.log('Toggle response:', response);
  } catch (error) {
      console.error('Background script error:', error);
      if (chrome.notifications && chrome.notifications.create) {
          chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icon.png',
              title: 'Smart Search Error',
              message: 'Failed to load the search tool. Please refresh the page and try again.'
          });
      }
  }
});