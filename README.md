# Dd-info — Website Inspector & Source Downloader

A Chrome extension that analyzes any website and lets you download its source code so you can learn from it and build similar sites.

## Features

- **Website Info** — Title, URL, description, language, charset, viewport
- **Tech Stack Detection** — Detects 30+ frameworks & libraries (React, Next.js, Vue, Angular, Svelte, jQuery, Bootstrap, Tailwind, WordPress, Shopify, and more)
- **Font Detection** — Lists all fonts used on the page
- **Color Palette** — Extracts colors used in the page (click to copy hex codes)
- **External Resources** — Lists all CSS, JS, CDN, and icon resources
- **Meta Tags** — View all meta tags on the page
- **Page Stats** — Quick stats on CSS files, JS files, images, and links
- **Source Code Download** — Download the page's HTML, CSS, JS, and images as a ZIP file

## Installation

### Chrome (Desktop)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `Dd-info` folder
6. The extension icon will appear in your toolbar

### Kiwi Browser (Android)

Kiwi Browser supports Chrome extensions on Android!

1. Download the extension as a ZIP file from this repository
2. Open Kiwi Browser on your Android device
3. Go to `kiwi://extensions`
4. Enable **Developer mode**
5. Tap **"Load"** or **"+(from .zip/.crx/.user.js)"**
6. Select the downloaded ZIP file
7. The extension will be installed and ready to use

> **Tip:** You can also load the unpacked folder if you have file manager access.

### Other Chromium Browsers

This extension works on any Chromium-based browser that supports Manifest V3:
- **Brave** — `brave://extensions/`
- **Edge** — `edge://extensions/`
- **Opera** — `opera://extensions/`
- **Vivaldi** — `vivaldi://extensions/`

## Usage

1. Navigate to any website you want to analyze
2. Click the **Dd-info** extension icon in your Chrome toolbar
3. View the website information, tech stack, fonts, colors, and more
4. Use the **Download Source Code** section to download HTML, CSS, JS, and images as a ZIP file

## Tech Stack Detection

The extension can detect the following technologies:

| Category | Technologies |
|----------|-------------|
| **Frameworks** | React, Next.js, Vue.js, Nuxt.js, Angular, Svelte, Gatsby, Ember.js |
| **CSS Frameworks** | Bootstrap, Tailwind CSS, Material UI, Chakra UI, Ant Design |
| **CMS** | WordPress, Shopify, Wix, Squarespace, Webflow |
| **Libraries** | jQuery, Lodash, D3.js, Three.js, GSAP, Moment.js, Backbone.js, Axios, Socket.io, Chart.js |
| **Analytics** | Google Analytics, Google Tag Manager |
| **Hosting** | Vercel, Netlify, Cloudflare, Firebase |
| **Other** | Font Awesome, AMP, PWA, TypeScript |

## Project Structure

```
Dd-info/
├── manifest.json        # Extension manifest (Manifest V3)
├── popup.html           # Popup UI
├── popup.css            # Popup styles (dark theme)
├── popup.js             # Popup logic & ZIP download
├── content.js           # Content script for page analysis
├── background.js        # Service worker
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── lib/
    └── jszip.min.js     # JSZip library for ZIP creation
```

## How Source Download Works

1. The content script collects:
   - Full page HTML
   - URLs of all linked CSS and JS files
   - Inline styles and scripts
   - Image URLs
2. The popup fetches each resource via the browser's fetch API
3. Everything is bundled into a ZIP file using JSZip
4. The ZIP is downloaded to your computer with a README summarizing the site's tech stack

## Privacy

- The extension runs entirely locally in your browser
- No data is sent to any server
- No tracking or analytics
- All analysis happens on the client side

## License

MIT
