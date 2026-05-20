# Dd-info — Website Inspector & Complete Source Cloner

A Chrome extension that analyzes any website and lets you download a **complete clone** of its source code — every UI element, button, font, color, animation, and style — so you can learn from it and build similar sites.

## Features

### Analysis
- **Website Info** — Title, URL, description, language, charset, viewport
- **Tech Stack Detection** — Detects 30+ frameworks & libraries (React, Next.js, Vue, Angular, Svelte, jQuery, Bootstrap, Tailwind, WordPress, Shopify, and more)
- **Font Detection** — Lists all fonts used on the page
- **Color Palette** — Extracts colors used in the page (click to copy hex codes)
- **External Resources** — Lists all CSS, JS, CDN, and icon resources
- **Meta Tags** — View all meta tags on the page
- **Page Stats** — Quick stats on CSS, JS, images, links, fonts, SVGs, forms, iframes
- **SEO Analysis** — SEO score, checks, and Open Graph data
- **Performance Analysis** — Load time, DOM ready, resource breakdown, tips
- **Security Scanner** — HTTPS, mixed content, CSP, SRI checks
- **Accessibility Checker** — Alt text, form labels, heading hierarchy, ARIA landmarks
- **AI Chat** — Ask questions about the website's tech stack, design, and more

### Complete Website Clone (NEW)
- **HTML** — Full page HTML source
- **CSS Files** — All external + inline stylesheets
- **JavaScript Files** — All external + inline scripts
- **Images** — All page images
- **Font Files** — Download all @font-face font files (woff2, woff, ttf, eot)
- **SVG Icons** — Extract all inline SVGs as individual .svg files
- **Favicons & Manifest** — Download all favicons, apple-touch-icons, and web manifest
- **Background Images** — Extract all CSS background-image URLs
- **CSS Variables** — Extract all CSS custom properties (:root variables) into a clean file
- **CSS Animations** — Extract all @keyframes and transition definitions
- **Button Styles** — Document every button and interactive element with exact computed styles
- **Form Structures** — Export form elements as HTML and JSON with all attributes
- **Layout Map** — Generate JSON structure map of the page DOM hierarchy
- **Computed Styles** — Extract computed styles for headers, navs, sections, and key elements
- **Media Queries** — Extract all responsive breakpoints
- **CSS Gradients** — Extract all gradient definitions used on the page
- **Typography Map** — Extract font sizes, weights, families, line-heights, letter-spacing for every element type
- **Shadows** — Extract all box-shadow and text-shadow values as CSS
- **Border Styles** — Extract all border styles and border-radius values
- **Navigation Structure** — Export nav menus as HTML + JSON with link hierarchy and dropdown detection
- **Table Data** — Export all tables as CSV + JSON files
- **Image Inventory** — Complete image map with dimensions, alt text, srcset, lazy-loading status
- **Z-Index Stack** — Map all positioned elements with z-index values
- **Data Attributes** — Export all custom `data-*` attributes with usage counts
- **Social Links** — Detect and export all social media profile links (Facebook, Twitter, Instagram, LinkedIn, YouTube, GitHub, TikTok, etc.)
- **Text Content** — Export all visible page text organized by section
- **Schema/JSON-LD** — Extract all structured data (Schema.org, JSON-LD)
- **Scroll Behaviors** — Document scroll snap, overflow, and scroll behavior properties
- **Select All / Deselect All** — Quick toggle for download options
- **Progress Bar** — Real-time download progress indicator

### Clone Details Tab (NEW)
- **Typography Map Viewer** — Browse font sizes, weights, and families for every element type
- **Navigation Menu Viewer** — See all nav links and their structure
- **Social Links Tags** — Quick view of all detected social media links
- **Image Inventory Stats** — Total images, images with alt text, lazy-loaded count
- **Shadows & Effects Panel** — Browse all box-shadow and text-shadow values
- **Z-Index Stack Panel** — Visual stacking order of positioned elements
- **Data Attributes Panel** — Browse all custom data-* attributes and their usage

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
4. Use the **Download Source Code** section — select what you want to clone and click **Download Complete Clone ZIP**

## What's in the ZIP?

```
website_complete_clone.zip/
├── index.html              # Full page HTML
├── README.md               # Site summary with tech stack, colors, fonts, variables
├── css/
│   ├── style_0.css         # External stylesheets
│   ├── inline_0.css        # Inline <style> blocks
│   ├── variables.css       # CSS custom properties (:root)
│   ├── animations.css      # @keyframes & transition data
│   ├── buttons.css         # Button & interactive element styles
│   ├── computed-styles.css  # Computed styles for key elements
│   ├── media-queries.css   # Responsive breakpoints
│   └── gradients.css       # CSS gradient definitions
├── js/
│   ├── script_0.js         # External scripts
│   └── inline_0.js         # Inline scripts
├── images/                 # Page images
├── fonts/                  # Font files (woff2, woff, ttf, etc.)
├── svgs/                   # Inline SVGs as individual files
├── favicons/
│   ├── favicon.ico         # Favicons
│   └── manifest.json       # Web manifest
├── bg-images/              # CSS background images
├── forms/
│   ├── forms.html          # Form structures in HTML
│   └── forms.json          # Form data in JSON
├── tables/
│   ├── table_0.csv         # Table data as CSV
│   └── tables.json         # All tables as JSON
├── content/
│   └── text-content.md     # Page text organized by sections
└── structure/
    ├── layout-map.json     # DOM hierarchy structure
    ├── navigation.html     # Nav menus as HTML
    ├── navigation.json     # Nav structure as JSON
    ├── image-inventory.json # Image map with dimensions & alt
    ├── z-index-map.json    # Z-index stacking order
    ├── data-attributes.json # Custom data-* attributes
    ├── social-links.html   # Social media links
    ├── social-links.json   # Social links as JSON
    ├── scroll-behaviors.json # Scroll snap & overflow info
    ├── schema-0.json       # Schema.org / JSON-LD data
    ├── iframes.json        # iframe sources
    └── media-sources.json  # Video/audio sources
```

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
   - Font file URLs from @font-face rules
   - All inline SVG elements
   - CSS custom properties (:root variables)
   - CSS animations and keyframes
   - Media queries and breakpoints
   - Form element structures
   - Button and interactive element styles
   - Background image URLs and gradients
   - Favicon and manifest URLs
   - Video/audio source URLs
   - Computed styles for key layout elements
   - DOM layout structure map
   - iframe source URLs
   - Typography map (font sizes, weights, line-heights)
   - Box shadows and text shadows
   - Border styles and border-radius values
   - Navigation menu structure with links
   - Table data for CSV export
   - Complete image inventory with dimensions and alt text
   - Z-index stacking map
   - Custom data-* attributes
   - Social media profile links
   - Visible text content by section
   - Schema.org / JSON-LD structured data
   - Scroll snap and overflow behaviors
2. The popup fetches each resource via the browser's fetch API
3. Everything is bundled into a complete clone ZIP file using JSZip
4. The ZIP is downloaded with a detailed README summarizing everything

## Privacy

- The extension runs entirely locally in your browser
- No data is sent to any server
- No tracking or analytics
- All analysis happens on the client side

## License

MIT
