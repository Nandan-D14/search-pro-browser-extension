# Search Pro Extension

**Search Pro Extension** is a modern, customizable Chrome extension that provides a sleek, glassy search interface for quick access to multiple search engines and custom websites. With a dark, transparent UI, drag-and-drop functionality, and recent search history, it enhances your browsing experience by streamlining searches across platforms like Google, YouTube, GitHub, and more. Whether you're a developer, researcher, or casual user, this extension saves time and keeps your searches organized.

## Why Use Search Pro Extension?

This extension is useful because it:

- **Centralizes Searches**: Access multiple search engines (Google, YouTube, GitHub, ChatGPT) and custom websites from one intuitive interface.
- **Saves Time**: Quickly switch engines, reuse recent searches, or add custom search URLs without navigating multiple tabs.
- **Enhances Productivity**: Drag-and-drop UI, Enter key support, and autofocus make searching seamless.
- **Customizable**: Add and delete custom search engines tailored to your needs (e.g., internal company search, niche platforms).
- **Modern Design**: A glassy, dark-themed UI with smooth animations (scale on toggle, hover effects) looks professional and feels polished.
- **Lightweight**: Runs efficiently as a Chrome extension, storing data locally with minimal impact on browser performance.

## Features

- **Search Engine Selection**: Choose from default engines (Google, YouTube, GitHub, ChatGPT) or custom websites via a dropdown.
- **Custom Websites**: Add and delete custom search URLs (e.g., `https://example.com?q={q}`) with unique names.
- **Recent Searches**: View up to 10 recent searches with engine names, timestamps, and clickable reuse. Scrollable history (two items visible) with individual delete buttons and a "Clear All" option.
- **Modern UI**: Glassy effect (`backdrop-filter: blur`), dark theme, system fonts, responsive design (`min(90vw, 480px)`), and animations (scale, hover).
- **Interactive Controls**:
  - Drag-and-drop via a handle to reposition the UI.
  - Close by clicking outside (no accidental reopening).
  - Search with the "Go" button or Enter key.
  - Autofocus on the search input when opened.
- **Persistent Storage**: Engine selection, custom websites, and search history are saved locally using Chrome's storage API.
- **Debug Support**: Includes a red debug background and on-screen log box (removable after testing) to troubleshoot issues.

## Installation

### Prerequisites

- **Google Chrome** browser (latest version recommended).
- **Git** installed to clone the repository.
- A **48x48 and 128x128 icon** (e.g., download from `https://via.placeholder.com/128` and save as `icon.png`).

### Steps to Install

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/your-username/glass-search-extension.git
   cd glass-search-extension
   ```

2. **Add an Icon**:

   - Download a 128x128 PNG image (e.g., from `https://via.placeholder.com/128`).
   - Save it as `icon.png` in the `glass-search-extension` folder.
   - Ensure the image is 48x48 and 128x128 compatible (Chrome scales it).

3. **Load the Extension in Chrome**:

   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer Mode** (toggle in the top-right corner).
   - Click **Load unpacked** and select the `glass-search-extension` folder.
   - The extension should appear in the extensions list with the name "Search Pro Extension."

4. **Clear Browser Cache** (Recommended):

   - Press `Ctrl+Shift+Delete` in Chrome.
   - Select "Cached images and files" and clear data to avoid loading stale scripts.

## Usage

1. **Open the Extension**:

   - Navigate to an http/https webpage (e.g., `https://example.com`).
   - Click the **Search Pro Extension** icon in the Chrome toolbar (pinned via `chrome://extensions/` &gt; "Details" &gt; "Pin").
   - A red debug box (or glassy UI after removing debug styles) should appear in the center of the screen.

2. **Search**:

   - Select a search engine from the dropdown (e.g., Google, YouTube).
   - Type a query in the input field (autofocused).
   - Press the **Go** button (→) or **Enter** to open the search in a new tab.
   - The query is saved in the "Recent Searches" section.

3. **Manage Custom Websites**:

   - Click **+ Add** under "Custom Websites."
   - Enter a **Website Name** (e.g., "My Site") and a **URL** (e.g., `https://example.com?q={q}`).
   - Click **Save** to add it to the dropdown and custom list.
   - Click **Delete** next to a custom website to remove it.

4. **Use Recent Searches**:

   - View recent searches under "Recent Searches" (scrollable, two visible).
   - Click a search to reuse it (populates input and selects engine).
   - Click **×** to delete a single search or **Clear All** to remove all.

5. **Move the UI**:

   - Drag the handle (gray bar at the top) to reposition the UI.
   - Release to set the new position.

6. **Close the UI**:

   - Click anywhere outside the UI to close it.
   - The UI won’t reopen until you click the extension icon again.

7. **Remove Debug Styles** (After Testing):

   - Open `content.js` in the extension folder.
   - Find the `#glass-search-container` CSS rule and change `background: rgba(255, 0, 0, 1)` to `background: rgba(18, 18, 18, 0.95)`.
   - Optionally, remove the `#glass-search-debug` CSS and all `this.debugLog` references (search for `debugLog` in `content.js`).
   - Reload the extension (`chrome://extensions/` &gt; refresh icon).

## Troubleshooting

If the extension doesn’t work or the UI isn’t visible:

 1. **Check Webpage**:

    - Ensure you’re on an http/https page (e.g., `https://example.com`, not `chrome://extensions/` or `file://`).
    - If you see a notification like “Please navigate to a webpage (http/https),” switch to a valid page.

 2. **Verify Debug Elements**:

    - Look for a **red box** (center of the screen) and a **black debug log box** (bottom-right).
    - The debug log box should show messages like `[time] GlassSearch: UI toggled: visible`.
    - If missing, check the Console (`Ctrl+Shift+J`) for errors (e.g., `Failed to append container`).

 3. **Inspect Console Logs**:

    - Open DevTools (`Ctrl+Shift+J`) and look for:
      - `GlassSearch: Container appended to body`
      - `GlassSearch: UI toggled: visible, Computed display: block, opacity: 1`
    - Note errors like `Receiving end does not exist` or `Failed to append container`.

 4. **Inspect DOM**:

    - Right-click, select "Inspect," find `<div id="glass-search-container">`.
    - Verify it has `class="visible"` and styles: `display: block`, `opacity: 1`, `position: fixed; top: 50%; left: 50%`.
    - Check for `<div id="glass-search-debug">` with log entries.

 5. **Test on a Blank Page**:

    - Create `test.html`:

      ```html
      <!DOCTYPE html>
      <html><body><h1>Test</h1></body></html>
      ```

    - Serve via `python -m http.server` and test at `http://localhost:8000`.

 6. **Disable Other Extensions**:

    - Disable other extensions in `chrome://extensions/` to avoid conflicts.

 7. **Clear Cache Again**:

    - Repeat `Ctrl+Shift+Delete` to clear cached scripts.

 8. **Check Permissions**:

    - Ensure Chrome prompts for permissions when loading the extension.
    - Check `chrome://extensions/` for errors or reload the extension.

 9. **Browser Restart**:

    - Close and reopen Chrome to clear session issues.

10. **Report Issues**:

    - Share:
      - Webpage URL (e.g., `https://example.com`).
      - Whether the red box or debug log box appears.
      - Console and debug log messages (especially errors).
      - DevTools findings (e.g., `<div id="glass-search-container">`, computed styles).
    - Open an issue on the GitHub repository with these details.

## Development

To contribute or modify the extension:

- **Files**:
  - `content.js`: Main script for the UI and logic.
  - `background.js`: Handles extension icon clicks and script injection.
  - `manifest.json`: Defines permissions and configuration.
  - `icon.png`: Extension icon (48x48 and 128x128).
- **Build**:
  - Edit files in the cloned repository.
  - Reload the extension in `chrome://extensions/` (refresh icon).
- **Debug**:
  - Use the debug log box and Console for real-time feedback.
  - Remove debug styles (`content.js`) for production.
- **Submit Changes**:
- Create a pull request with your changes.
- Ensure the extension works on `https://example.com` and includes no errors in the Console.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments

- Built with inspiration from modern UI trends and Chrome extension APIs.
- Debug techniques adapted from Chrome developer documentation.

---

**Get searching with Search Pro Extension!** If you encounter issues or have feature requests, open an issue on GitHub or contact the maintainers.
