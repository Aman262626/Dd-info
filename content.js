/* Dd-info Content Script — runs on every page to collect site information */

(function () {
  "use strict";

  /* ── Tech-stack detection signatures ── */
  const TECH_SIGNATURES = [
    { name: "React", test: () => !!document.querySelector("[data-reactroot],[data-reactid]") || !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || !!document.querySelector("#__next") },
    { name: "Next.js", test: () => !!document.querySelector("#__next") || !!window.__NEXT_DATA__ },
    { name: "Vue.js", test: () => !!document.querySelector("[data-v-]") || !!window.__VUE__ || !!window.__VUE_DEVTOOLS_GLOBAL_HOOK__ },
    { name: "Nuxt.js", test: () => !!window.__NUXT__ || !!document.querySelector("#__nuxt") },
    { name: "Angular", test: () => !!document.querySelector("[ng-version],[ng-app],._nghost-*") || !!window.getAllAngularRootElements },
    { name: "Svelte", test: () => !!document.querySelector("[class*='svelte-']") },
    { name: "jQuery", test: () => !!window.jQuery || !!window.$ },
    { name: "Bootstrap", test: () => !!document.querySelector("link[href*='bootstrap'],script[src*='bootstrap'],.container-fluid,.navbar") && !!document.querySelector("[class*='col-']") },
    { name: "Tailwind CSS", test: () => { const el = document.querySelector("[class]"); return el && /\b(flex|grid|mt-|mb-|px-|py-|text-|bg-|rounded-|shadow-)\b/.test(document.documentElement.innerHTML.slice(0, 50000)); } },
    { name: "WordPress", test: () => !!document.querySelector("meta[name='generator'][content*='WordPress'],link[href*='wp-content'],link[href*='wp-includes']") },
    { name: "Shopify", test: () => !!window.Shopify || !!document.querySelector("link[href*='cdn.shopify']") },
    { name: "Wix", test: () => !!document.querySelector("meta[name='generator'][content*='Wix']") || !!window.wixBiSession },
    { name: "Squarespace", test: () => !!document.querySelector("script[src*='squarespace'],.sqs-block") },
    { name: "Webflow", test: () => !!document.querySelector("html[data-wf-site],meta[content*='Webflow']") },
    { name: "Gatsby", test: () => !!document.querySelector("#___gatsby") },
    { name: "Ember.js", test: () => !!window.Ember || !!document.querySelector(".ember-view") },
    { name: "Backbone.js", test: () => !!window.Backbone },
    { name: "Lodash", test: () => !!window._ && typeof window._.VERSION === "string" },
    { name: "D3.js", test: () => !!window.d3 },
    { name: "Three.js", test: () => !!window.THREE },
    { name: "GSAP", test: () => !!window.gsap || !!window.TweenMax },
    { name: "Moment.js", test: () => !!window.moment },
    { name: "TypeScript", test: () => !!document.querySelector("script[src*='.ts']") },
    { name: "Google Analytics", test: () => !!window.ga || !!window.gtag || !!document.querySelector("script[src*='google-analytics'],script[src*='googletagmanager']") },
    { name: "Google Tag Manager", test: () => !!window.google_tag_manager || !!document.querySelector("script[src*='googletagmanager.com/gtm']") },
    { name: "Font Awesome", test: () => !!document.querySelector("link[href*='font-awesome'],link[href*='fontawesome'],script[src*='fontawesome'],.fa,.fas,.fab,.far") },
    { name: "Material UI", test: () => !!document.querySelector("[class*='MuiButton'],[class*='MuiGrid'],[class*='makeStyles']") },
    { name: "Chakra UI", test: () => !!document.querySelector("[class*='chakra-']") },
    { name: "Ant Design", test: () => !!document.querySelector("[class*='ant-']") },
    { name: "Firebase", test: () => !!window.firebase || !!document.querySelector("script[src*='firebase']") },
    { name: "Cloudflare", test: () => !!document.querySelector("script[src*='cloudflare'],link[href*='cdnjs.cloudflare.com']") },
    { name: "Vercel", test: () => !!document.querySelector("meta[name='next-head-count']") || document.cookie.includes("__vercel") },
    { name: "Netlify", test: () => !!document.querySelector("meta[name='generator'][content*='Netlify']") },
    { name: "AMP", test: () => !!document.querySelector("html[amp],html[⚡]") },
    { name: "PWA", test: () => !!document.querySelector("link[rel='manifest']") },
  ];

  /* ── Collect fonts ── */
  function collectFonts() {
    const fonts = new Set();
    const computed = new Set();

    document.querySelectorAll("body *").forEach((el) => {
      if (computed.size > 200) return;
      const ff = getComputedStyle(el).fontFamily;
      if (ff && !computed.has(ff)) {
        computed.add(ff);
        ff.split(",").forEach((f) => {
          const clean = f.trim().replace(/['"]/g, "");
          if (clean && clean !== "inherit" && clean !== "initial") {
            fonts.add(clean);
          }
        });
      }
    });

    // Also check @font-face from stylesheets
    try {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSFontFaceRule) {
              const family = rule.style.getPropertyValue("font-family").replace(/['"]/g, "").trim();
              if (family) fonts.add(family);
            }
          }
        } catch (_) { /* cross-origin */ }
      }
    } catch (_) { /* access denied */ }

    return [...fonts].slice(0, 20);
  }

  /* ── Collect colors ── */
  function collectColors() {
    const colorMap = {};
    const seen = new Set();
    let count = 0;

    document.querySelectorAll("body *").forEach((el) => {
      if (count > 150) return;
      count++;
      const style = getComputedStyle(el);
      [style.color, style.backgroundColor, style.borderColor].forEach((c) => {
        if (!c || c === "rgba(0, 0, 0, 0)" || c === "transparent" || seen.has(c)) return;
        seen.add(c);
        const hex = rgbToHex(c);
        if (hex && hex !== "#000000" && hex !== "#ffffff") {
          colorMap[hex] = (colorMap[hex] || 0) + 1;
        }
      });
    });

    // Also check CSS custom properties from :root
    try {
      const rootStyles = getComputedStyle(document.documentElement);
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText === ":root" || rule.selectorText === "html") {
              for (const prop of rule.style) {
                if (prop.startsWith("--")) {
                  const val = rootStyles.getPropertyValue(prop).trim();
                  const hex = rgbToHex(val) || (val.match(/^#[0-9a-f]{3,8}$/i) ? val : null);
                  if (hex) colorMap[hex] = (colorMap[hex] || 0) + 1;
                }
              }
            }
          }
        } catch (_) { /* cross-origin */ }
      }
    } catch (_) { /* access denied */ }

    return Object.entries(colorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([hex]) => hex);
  }

  function rgbToHex(rgb) {
    if (!rgb) return null;
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return null;
    return "#" + [match[1], match[2], match[3]].map((x) => parseInt(x).toString(16).padStart(2, "0")).join("");
  }

  /* ── Collect external resources ── */
  function collectResources() {
    const resources = [];
    document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
      if (el.href) resources.push({ type: "CSS", url: el.href });
    });
    document.querySelectorAll("script[src]").forEach((el) => {
      resources.push({ type: "JS", url: el.src });
    });
    document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]').forEach((el) => {
      if (el.href) resources.push({ type: "Icon", url: el.href });
    });
    document.querySelectorAll('link[rel="preconnect"],link[rel="dns-prefetch"]').forEach((el) => {
      if (el.href) resources.push({ type: "CDN", url: el.href });
    });
    return resources.slice(0, 30);
  }

  /* ── Collect meta tags ── */
  function collectMeta() {
    const metas = [];
    document.querySelectorAll("meta").forEach((el) => {
      const name = el.getAttribute("name") || el.getAttribute("property") || el.getAttribute("http-equiv");
      const content = el.getAttribute("content");
      if (name && content) {
        metas.push({ name, content });
      }
    });
    return metas;
  }

  /* ── Collect page resource URLs for download ── */
  function collectDownloadResources() {
    const css = [];
    const js = [];
    const images = [];

    document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
      if (el.href) css.push(el.href);
    });

    document.querySelectorAll("script[src]").forEach((el) => {
      if (el.src) js.push(el.src);
    });

    document.querySelectorAll("img[src]").forEach((el) => {
      if (el.src && !el.src.startsWith("data:")) images.push(el.src);
    });

    // Inline styles as well
    const inlineCSS = [];
    document.querySelectorAll("style").forEach((el) => {
      if (el.textContent.trim()) inlineCSS.push(el.textContent);
    });

    // Inline scripts
    const inlineJS = [];
    document.querySelectorAll("script:not([src])").forEach((el) => {
      if (el.textContent.trim() && el.type !== "application/ld+json" && el.type !== "application/json") {
        inlineJS.push(el.textContent);
      }
    });

    return { css, js, images, inlineCSS, inlineJS };
  }

  /* ── SEO Analysis ── */
  function analyzeSEO() {
    const checks = [];
    const title = document.title;
    const descMeta = document.querySelector("meta[name='description']");
    const desc = descMeta ? descMeta.getAttribute("content") : "";
    const h1s = document.querySelectorAll("h1");
    const canonicalLink = document.querySelector("link[rel='canonical']");
    const ogTitle = document.querySelector("meta[property='og:title']");
    const ogDesc = document.querySelector("meta[property='og:description']");
    const ogImage = document.querySelector("meta[property='og:image']");
    const twitterCard = document.querySelector("meta[name='twitter:card']");
    const viewport = document.querySelector("meta[name='viewport']");
    const robots = document.querySelector("meta[name='robots']");
    const favicon = document.querySelector("link[rel='icon'],link[rel='shortcut icon']");
    const lang = document.documentElement.lang;
    const altImages = document.querySelectorAll("img:not([alt]),img[alt='']");
    const allImages = document.querySelectorAll("img");
    const https = window.location.protocol === "https:";

    // Title checks
    if (title && title.length > 0) {
      if (title.length >= 30 && title.length <= 60) checks.push({ pass: true, text: "Title tag is good length (" + title.length + " chars)" });
      else if (title.length < 30) checks.push({ pass: "warn", text: "Title is too short (" + title.length + " chars, aim for 30-60)" });
      else checks.push({ pass: "warn", text: "Title is too long (" + title.length + " chars, aim for 30-60)" });
    } else {
      checks.push({ pass: false, text: "Missing title tag" });
    }

    // Description checks
    if (desc && desc.length > 0) {
      if (desc.length >= 120 && desc.length <= 160) checks.push({ pass: true, text: "Meta description is good length (" + desc.length + " chars)" });
      else if (desc.length < 120) checks.push({ pass: "warn", text: "Meta description is short (" + desc.length + " chars, aim for 120-160)" });
      else checks.push({ pass: "warn", text: "Meta description is long (" + desc.length + " chars, aim for 120-160)" });
    } else {
      checks.push({ pass: false, text: "Missing meta description" });
    }

    // H1 check
    if (h1s.length === 1) checks.push({ pass: true, text: "Single H1 tag found" });
    else if (h1s.length === 0) checks.push({ pass: false, text: "No H1 tag found" });
    else checks.push({ pass: "warn", text: "Multiple H1 tags found (" + h1s.length + ")" });

    // Canonical
    checks.push(canonicalLink ? { pass: true, text: "Canonical URL is set" } : { pass: false, text: "Missing canonical URL" });

    // Open Graph
    checks.push(ogTitle ? { pass: true, text: "OG Title is set" } : { pass: false, text: "Missing og:title" });
    checks.push(ogDesc ? { pass: true, text: "OG Description is set" } : { pass: false, text: "Missing og:description" });
    checks.push(ogImage ? { pass: true, text: "OG Image is set" } : { pass: "warn", text: "Missing og:image" });
    checks.push(twitterCard ? { pass: true, text: "Twitter Card is set" } : { pass: "warn", text: "Missing twitter:card" });

    // Technical
    checks.push(viewport ? { pass: true, text: "Viewport meta is set (mobile-friendly)" } : { pass: false, text: "Missing viewport meta tag" });
    checks.push(favicon ? { pass: true, text: "Favicon is set" } : { pass: "warn", text: "Missing favicon" });
    checks.push(lang ? { pass: true, text: "HTML lang attribute is set (" + lang + ")" } : { pass: false, text: "Missing HTML lang attribute" });
    checks.push(https ? { pass: true, text: "Using HTTPS" } : { pass: false, text: "Not using HTTPS" });

    // Image alt texts
    if (allImages.length > 0) {
      if (altImages.length === 0) checks.push({ pass: true, text: "All images have alt text" });
      else checks.push({ pass: "warn", text: altImages.length + " of " + allImages.length + " images missing alt text" });
    }

    // Robots
    if (robots) {
      const content = robots.getAttribute("content") || "";
      if (content.includes("noindex")) checks.push({ pass: "warn", text: "Page is set to noindex" });
      else checks.push({ pass: true, text: "Page is indexable" });
    }

    // Score
    const total = checks.length;
    const passed = checks.filter((c) => c.pass === true).length;
    const score = Math.round((passed / total) * 100);

    // OG data
    const ogData = {
      title: ogTitle ? ogTitle.getAttribute("content") : "—",
      description: ogDesc ? ogDesc.getAttribute("content") : "—",
      image: ogImage ? ogImage.getAttribute("content") : "—",
      twitterCard: twitterCard ? twitterCard.getAttribute("content") : "—",
      canonical: canonicalLink ? canonicalLink.getAttribute("href") : "—",
    };

    return { checks, score, ogData };
  }

  /* ── Performance Analysis ── */
  function analyzePerformance() {
    const perf = {};
    try {
      const timing = performance.timing || {};
      const nav = performance.getEntriesByType("navigation")[0] || {};

      perf.loadTime = nav.loadEventEnd ? Math.round(nav.loadEventEnd - nav.startTime) : (timing.loadEventEnd && timing.navigationStart ? timing.loadEventEnd - timing.navigationStart : 0);
      perf.domReady = nav.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : (timing.domContentLoadedEventEnd && timing.navigationStart ? timing.domContentLoadedEventEnd - timing.navigationStart : 0);

      const resources = performance.getEntriesByType("resource");
      perf.resourceCount = resources.length;

      // Resource breakdown by type
      const breakdown = { css: 0, js: 0, img: 0, font: 0, other: 0 };
      const sizes = { css: 0, js: 0, img: 0, font: 0, other: 0 };
      resources.forEach((r) => {
        const size = r.transferSize || r.encodedBodySize || 0;
        if (r.initiatorType === "link" || r.name.match(/\.css/)) { breakdown.css++; sizes.css += size; }
        else if (r.initiatorType === "script" || r.name.match(/\.js/)) { breakdown.js++; sizes.js += size; }
        else if (r.initiatorType === "img" || r.name.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)/)) { breakdown.img++; sizes.img += size; }
        else if (r.name.match(/\.(woff|woff2|ttf|eot|otf)/)) { breakdown.font++; sizes.font += size; }
        else { breakdown.other++; sizes.other += size; }
      });

      perf.breakdown = breakdown;
      perf.sizes = sizes;
      perf.totalSize = Object.values(sizes).reduce((a, b) => a + b, 0);

      // Tips
      const tips = [];
      if (perf.loadTime > 3000) tips.push({ pass: false, text: "Page loads slowly (" + (perf.loadTime / 1000).toFixed(1) + "s). Consider optimizing." });
      else tips.push({ pass: true, text: "Page loads quickly (" + (perf.loadTime / 1000).toFixed(1) + "s)" });

      if (breakdown.js > 20) tips.push({ pass: "warn", text: "Too many JS files (" + breakdown.js + "). Consider bundling." });
      if (breakdown.css > 10) tips.push({ pass: "warn", text: "Too many CSS files (" + breakdown.css + "). Consider combining." });
      if (sizes.img > 2 * 1024 * 1024) tips.push({ pass: "warn", text: "Large image payload (" + formatBytes(sizes.img) + "). Compress images." });
      if (perf.totalSize > 5 * 1024 * 1024) tips.push({ pass: false, text: "Total page size is large (" + formatBytes(perf.totalSize) + ")" });
      else tips.push({ pass: true, text: "Total page size is reasonable (" + formatBytes(perf.totalSize) + ")" });

      if (!document.querySelector("script[async],script[defer]") && document.querySelectorAll("script[src]").length > 3) {
        tips.push({ pass: "warn", text: "Consider using async/defer on script tags" });
      }

      perf.tips = tips;
    } catch (_) {
      perf.loadTime = 0;
      perf.domReady = 0;
      perf.resourceCount = 0;
      perf.breakdown = {};
      perf.sizes = {};
      perf.totalSize = 0;
      perf.tips = [];
    }
    return perf;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + units[i];
  }

  /* ── Main analysis function ── */
  function analyzeWebsite() {
    const techStack = [];
    TECH_SIGNATURES.forEach((sig) => {
      try {
        if (sig.test()) techStack.push(sig.name);
      } catch (_) { /* ignore errors in detection */ }
    });

    // Additional detection from script/link sources
    const scripts = [...document.querySelectorAll("script[src]")].map((s) => s.src.toLowerCase());
    const links = [...document.querySelectorAll("link[href]")].map((l) => l.href.toLowerCase());
    const allSrcs = [...scripts, ...links].join(" ");

    const extraDetections = [
      { name: "React", pattern: /react/ },
      { name: "Angular", pattern: /angular/ },
      { name: "Vue.js", pattern: /vue\./ },
      { name: "Ember.js", pattern: /ember/ },
      { name: "Backbone.js", pattern: /backbone/ },
      { name: "Handlebars", pattern: /handlebars/ },
      { name: "Underscore.js", pattern: /underscore/ },
      { name: "Axios", pattern: /axios/ },
      { name: "Socket.io", pattern: /socket\.io/ },
      { name: "Chart.js", pattern: /chart\.js|chartjs/ },
      { name: "Highlight.js", pattern: /highlight\.js|hljs/ },
      { name: "Prism.js", pattern: /prism\.js|prismjs/ },
    ];

    extraDetections.forEach(({ name, pattern }) => {
      if (!techStack.includes(name) && pattern.test(allSrcs)) {
        techStack.push(name);
      }
    });

    const viewportMeta = document.querySelector("meta[name='viewport']");
    const charsetMeta = document.querySelector("meta[charset]") || document.querySelector("meta[http-equiv='Content-Type']");
    const descMeta = document.querySelector("meta[name='description']") || document.querySelector("meta[property='og:description']");

    return {
      title: document.title || "—",
      url: window.location.href,
      description: descMeta ? descMeta.getAttribute("content") : "—",
      language: document.documentElement.lang || "—",
      charset: charsetMeta ? (charsetMeta.getAttribute("charset") || charsetMeta.getAttribute("content")) : "—",
      viewport: viewportMeta ? viewportMeta.getAttribute("content") : "—",
      techStack,
      fonts: collectFonts(),
      colors: collectColors(),
      resources: collectResources(),
      metaTags: collectMeta(),
      stats: {
        cssFiles: document.querySelectorAll('link[rel="stylesheet"]').length,
        jsFiles: document.querySelectorAll("script[src]").length,
        images: document.querySelectorAll("img").length,
        links: document.querySelectorAll("a[href]").length,
      },
      html: document.documentElement.outerHTML,
      downloadResources: collectDownloadResources(),
      seo: analyzeSEO(),
      performance: analyzePerformance(),
    };
  }

  /* ── Listen for messages from popup ── */
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "analyze") {
      try {
        const data = analyzeWebsite();
        sendResponse({ success: true, data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true; // keep channel open for async
  });
})();
