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

    // Srcset images (responsive)
    const srcsetImages = [];
    document.querySelectorAll("img[srcset], picture source[srcset]").forEach((el) => {
      const srcset = el.getAttribute("srcset");
      if (srcset) {
        srcset.split(",").forEach((entry) => {
          const url = entry.trim().split(/\s+/)[0];
          if (url && !url.startsWith("data:")) {
            try { srcsetImages.push(new URL(url, window.location.href).href); } catch (_) {}
          }
        });
      }
    });

    // Picture source elements
    document.querySelectorAll("picture source[src]").forEach((el) => {
      const src = el.getAttribute("src");
      if (src && !src.startsWith("data:")) {
        try { srcsetImages.push(new URL(src, window.location.href).href); } catch (_) {}
      }
    });

    // Video posters & sources
    const mediaUrls = [];
    document.querySelectorAll("video[poster]").forEach((el) => {
      try { mediaUrls.push(new URL(el.getAttribute("poster"), window.location.href).href); } catch (_) {}
    });
    document.querySelectorAll("video source[src], audio source[src]").forEach((el) => {
      try { mediaUrls.push(new URL(el.getAttribute("src"), window.location.href).href); } catch (_) {}
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

    return { css, js, images, srcsetImages, mediaUrls, inlineCSS, inlineJS };
  }

  /* ── Collect working clone data — all resources needed for standalone site ── */
  function collectWorkingCloneData() {
    const data = {
      googleFontsCSS: [],
      cdnResources: [],
      preloadResources: [],
      allLinkTags: [],
      faviconUrls: [],
      metaCharset: "UTF-8",
      viewport: "",
      baseUrl: window.location.origin,
      fullUrl: window.location.href,
    };

    // Meta charset & viewport
    const charsetMeta = document.querySelector("meta[charset]");
    if (charsetMeta) data.metaCharset = charsetMeta.getAttribute("charset") || "UTF-8";
    const viewportMeta = document.querySelector("meta[name='viewport']");
    if (viewportMeta) data.viewport = viewportMeta.getAttribute("content") || "";

    // Google Fonts CSS
    document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.bunny.net"]').forEach((el) => {
      if (el.href) data.googleFontsCSS.push(el.href);
    });

    // CDN resources
    document.querySelectorAll("link[href], script[src]").forEach((el) => {
      const url = el.href || el.src;
      if (!url) return;
      const isCDN = /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|cdn\.tailwindcss\.com|stackpath|maxcdn|ajax\.googleapis\.com|code\.jquery\.com|cdn\.bootcdn\.net|cdn\.rawgit\.com/.test(url);
      if (isCDN) {
        data.cdnResources.push({
          url,
          tag: el.tagName.toLowerCase(),
          type: el.tagName === "LINK" ? "css" : "js",
        });
      }
    });

    // Preload/prefetch resources
    document.querySelectorAll('link[rel="preload"], link[rel="prefetch"], link[rel="modulepreload"]').forEach((el) => {
      if (el.href) {
        data.preloadResources.push({ url: el.href, as: el.getAttribute("as") || "", type: el.getAttribute("type") || "" });
      }
    });

    // All link tags (for full head reconstruction)
    document.querySelectorAll("link").forEach((el) => {
      const attrs = {};
      for (const attr of el.attributes) attrs[attr.name] = attr.value;
      data.allLinkTags.push(attrs);
    });

    // Favicon URLs
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((el) => {
      if (el.href) data.faviconUrls.push(el.href);
    });

    return data;
  }

  /* ── 1. Collect Font File URLs ── */
  function collectFontFiles() {
    const fontUrls = new Set();
    try {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSFontFaceRule) {
              const src = rule.style.getPropertyValue("src");
              if (src) {
                const urlMatches = src.match(/url\(["']?([^"')]+)["']?\)/g);
                if (urlMatches) {
                  urlMatches.forEach((m) => {
                    const url = m.replace(/url\(["']?/, "").replace(/["']?\)/, "").split("#")[0].split("?")[0];
                    if (url && !url.startsWith("data:")) {
                      try { fontUrls.add(new URL(url, sheet.href || window.location.href).href); } catch (_) {}
                    }
                  });
                }
              }
            }
          }
        } catch (_) { /* cross-origin */ }
      }
    } catch (_) {}
    // Also check link preloads for fonts
    document.querySelectorAll('link[rel="preload"][as="font"],link[rel="prefetch"][as="font"]').forEach((el) => {
      if (el.href) fontUrls.add(el.href);
    });
    return [...fontUrls];
  }

  /* ── 2. Collect Inline SVGs ── */
  function collectInlineSVGs() {
    const svgs = [];
    document.querySelectorAll("svg").forEach((svg, i) => {
      const clone = svg.cloneNode(true);
      if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(clone);
      const id = svg.getAttribute("id") || svg.getAttribute("class") || ("svg_" + i);
      svgs.push({ id: id.replace(/[^a-zA-Z0-9_-]/g, "_"), content: svgStr });
    });
    return svgs.slice(0, 100);
  }

  /* ── 3. Collect CSS Custom Properties (Variables) ── */
  function collectCSSVariables() {
    const vars = {};
    try {
      const rootStyles = getComputedStyle(document.documentElement);
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText === ":root" || rule.selectorText === "html" || rule.selectorText === "body") {
              for (const prop of rule.style) {
                if (prop.startsWith("--")) {
                  vars[prop] = rootStyles.getPropertyValue(prop).trim();
                }
              }
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
    return vars;
  }

  /* ── 4. Collect CSS Animations & Keyframes ── */
  function collectAnimations() {
    const keyframes = [];
    const transitions = [];
    try {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSKeyframesRule) {
              let kfText = "@keyframes " + rule.name + " {\n";
              for (const kf of rule.cssRules) {
                kfText += "  " + kf.keyText + " { " + kf.style.cssText + " }\n";
              }
              kfText += "}";
              keyframes.push(kfText);
            }
          }
        } catch (_) {}
      }
    } catch (_) {}

    document.querySelectorAll("body *").forEach((el) => {
      if (transitions.length > 50) return;
      const style = getComputedStyle(el);
      const anim = style.animationName;
      const trans = style.transition;
      if (anim && anim !== "none" && !transitions.some((t) => t.animation === anim)) {
        transitions.push({
          selector: getSelector(el),
          animation: anim,
          duration: style.animationDuration,
          timingFunction: style.animationTimingFunction,
          transition: trans !== "all 0s ease 0s" ? trans : "",
        });
      }
    });

    return { keyframes, transitions };
  }

  /* ── 5. Collect Media Queries ── */
  function collectMediaQueries() {
    const queries = new Set();
    try {
      for (const sheet of document.styleSheets) {
        try {
          const extractMQ = (rules) => {
            for (const rule of rules) {
              if (rule instanceof CSSMediaRule) {
                queries.add(rule.conditionText || rule.media.mediaText);
              }
              if (rule.cssRules) extractMQ(rule.cssRules);
            }
          };
          extractMQ(sheet.cssRules);
        } catch (_) {}
      }
    } catch (_) {}
    return [...queries];
  }

  /* ── 6. Collect Form Elements ── */
  function collectFormElements() {
    const forms = [];
    document.querySelectorAll("form").forEach((form, fi) => {
      const fields = [];
      form.querySelectorAll("input,textarea,select,button").forEach((el) => {
        const field = {
          tag: el.tagName.toLowerCase(),
          type: el.type || "",
          name: el.name || "",
          id: el.id || "",
          placeholder: el.placeholder || "",
          required: el.required || false,
          value: el.type === "submit" || el.type === "button" ? el.value : "",
        };
        if (el.tagName === "SELECT") {
          field.options = [...el.options].map((o) => ({ value: o.value, text: o.text }));
        }
        fields.push(field);
      });
      forms.push({
        id: form.id || ("form_" + fi),
        action: form.action || "",
        method: form.method || "get",
        fields,
      });
    });
    return forms;
  }

  /* ── 7. Collect Buttons & Interactive Elements ── */
  function collectInteractiveElements() {
    const elements = [];
    const selectors = "button,a[role='button'],[type='submit'],[type='button'],input[type='reset'],.btn,[class*='button'],[class*='btn']";
    document.querySelectorAll(selectors).forEach((el, i) => {
      if (elements.length > 80) return;
      const style = getComputedStyle(el);
      elements.push({
        tag: el.tagName.toLowerCase(),
        text: el.textContent.trim().substring(0, 50),
        type: el.type || "",
        classes: el.className || "",
        styles: {
          background: style.background,
          backgroundColor: style.backgroundColor,
          color: style.color,
          border: style.border,
          borderRadius: style.borderRadius,
          padding: style.padding,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          cursor: style.cursor,
          boxShadow: style.boxShadow,
          transition: style.transition,
        },
      });
    });
    return elements;
  }

  /* ── 8. Collect Background Images & Gradients ── */
  function collectBackgrounds() {
    const bgImages = new Set();
    const gradients = [];
    document.querySelectorAll("body *").forEach((el) => {
      if (bgImages.size > 50 && gradients.length > 50) return;
      const style = getComputedStyle(el);
      const bgImg = style.backgroundImage;
      if (bgImg && bgImg !== "none") {
        const urlMatch = bgImg.match(/url\(["']?([^"')]+)["']?\)/);
        if (urlMatch && !urlMatch[1].startsWith("data:")) {
          try { bgImages.add(new URL(urlMatch[1], window.location.href).href); } catch (_) {}
        }
        if (bgImg.includes("gradient")) {
          gradients.push({ selector: getSelector(el), gradient: bgImg });
        }
      }
    });
    return { imageUrls: [...bgImages], gradients: gradients.slice(0, 30) };
  }

  /* ── 9. Collect Favicon & Web Manifest ── */
  function collectFaviconsAndManifest() {
    const favicons = [];
    document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="apple-touch-icon-precomposed"],link[rel="mask-icon"]').forEach((el) => {
      if (el.href) favicons.push({ rel: el.rel, href: el.href, sizes: el.sizes ? el.sizes.toString() : "" });
    });
    const manifest = document.querySelector('link[rel="manifest"]');
    return {
      favicons,
      manifestUrl: manifest ? manifest.href : null,
    };
  }

  /* ── 10. Collect Video & Audio Sources ── */
  function collectMediaSources() {
    const videos = [];
    const audios = [];
    document.querySelectorAll("video").forEach((v) => {
      const sources = [...v.querySelectorAll("source")].map((s) => ({ src: s.src, type: s.type }));
      if (v.src) sources.push({ src: v.src, type: v.type || "" });
      if (sources.length) videos.push({ poster: v.poster || "", sources });
    });
    document.querySelectorAll("audio").forEach((a) => {
      const sources = [...a.querySelectorAll("source")].map((s) => ({ src: s.src, type: s.type }));
      if (a.src) sources.push({ src: a.src, type: a.type || "" });
      if (sources.length) audios.push({ sources });
    });
    return { videos, audios };
  }

  /* ── 11. Collect Computed Styles for Key Elements ── */
  function collectComputedStyles() {
    const elemStyles = [];
    const keySelectors = "header,nav,main,footer,section,article,aside,.hero,.navbar,.sidebar,.card,.modal,.dropdown,h1,h2,h3";
    document.querySelectorAll(keySelectors).forEach((el) => {
      if (elemStyles.length > 40) return;
      const style = getComputedStyle(el);
      elemStyles.push({
        selector: getSelector(el),
        tag: el.tagName.toLowerCase(),
        styles: {
          display: style.display,
          position: style.position,
          width: style.width,
          maxWidth: style.maxWidth,
          height: style.height,
          margin: style.margin,
          padding: style.padding,
          background: style.background,
          backgroundColor: style.backgroundColor,
          color: style.color,
          fontSize: style.fontSize,
          fontFamily: style.fontFamily,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          textAlign: style.textAlign,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          flexDirection: style.flexDirection,
          justifyContent: style.justifyContent,
          alignItems: style.alignItems,
          gap: style.gap,
          gridTemplateColumns: style.gridTemplateColumns,
          overflow: style.overflow,
          zIndex: style.zIndex,
        },
      });
    });
    return elemStyles;
  }

  /* ── 12. Collect Layout Structure Map ── */
  function collectLayoutMap() {
    function mapNode(el, depth) {
      if (depth > 4) return null;
      const children = [];
      for (const child of el.children) {
        if (["SCRIPT", "STYLE", "NOSCRIPT", "LINK", "META"].includes(child.tagName)) continue;
        const mapped = mapNode(child, depth + 1);
        if (mapped) children.push(mapped);
      }
      const style = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        classes: el.className ? (typeof el.className === "string" ? el.className.split(" ").slice(0, 5).join(" ") : "") : undefined,
        display: style.display,
        position: style.position !== "static" ? style.position : undefined,
        children: children.length > 0 ? children.slice(0, 15) : undefined,
      };
    }
    const body = document.querySelector("body");
    return body ? mapNode(body, 0) : null;
  }

  /* ── 13. Collect iframe Sources ── */
  function collectIframeSources() {
    const iframes = [];
    document.querySelectorAll("iframe").forEach((iframe) => {
      iframes.push({
        src: iframe.src || "",
        title: iframe.title || "",
        width: iframe.width || iframe.style.width || "",
        height: iframe.height || iframe.style.height || "",
        allow: iframe.allow || "",
      });
    });
    return iframes.slice(0, 20);
  }

  /* ── 14. Collect Structured Data (JSON-LD / Schema.org) ── */
  function collectStructuredData() {
    const data = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
      try { data.push(JSON.parse(el.textContent)); } catch (_) {}
    });
    return data;
  }

  /* ── 15. Collect Spacing & Typography Map ── */
  function collectTypography() {
    const typo = {};
    const seen = new Set();
    document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,a,li,td,th,label,blockquote,figcaption,button").forEach((el) => {
      if (Object.keys(typo).length > 40) return;
      const style = getComputedStyle(el);
      const key = el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : "");
      if (seen.has(key)) return;
      seen.add(key);
      typo[key] = {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fontFamily: style.fontFamily,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
        textDecoration: style.textDecoration,
        color: style.color,
        marginTop: style.marginTop,
        marginBottom: style.marginBottom,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
      };
    });
    return typo;
  }

  /* ── 16. Collect Shadows (box-shadow & text-shadow) ── */
  function collectShadows() {
    const boxShadows = [];
    const textShadows = [];
    const seenBox = new Set();
    const seenText = new Set();
    document.querySelectorAll("body *").forEach((el) => {
      if (boxShadows.length > 30 && textShadows.length > 20) return;
      const style = getComputedStyle(el);
      if (style.boxShadow && style.boxShadow !== "none" && !seenBox.has(style.boxShadow)) {
        seenBox.add(style.boxShadow);
        boxShadows.push({ selector: getSelector(el), value: style.boxShadow });
      }
      if (style.textShadow && style.textShadow !== "none" && !seenText.has(style.textShadow)) {
        seenText.add(style.textShadow);
        textShadows.push({ selector: getSelector(el), value: style.textShadow });
      }
    });
    return { boxShadows, textShadows };
  }

  /* ── 17. Collect Border Styles ── */
  function collectBorders() {
    const borders = [];
    const seen = new Set();
    document.querySelectorAll("body *").forEach((el) => {
      if (borders.length > 40) return;
      const style = getComputedStyle(el);
      const border = style.border;
      const radius = style.borderRadius;
      if ((border && border !== "0px none rgb(0, 0, 0)" && !seen.has(border + radius))) {
        seen.add(border + radius);
        borders.push({
          selector: getSelector(el),
          border: border,
          borderRadius: radius,
          borderTop: style.borderTop,
          borderBottom: style.borderBottom,
          borderLeft: style.borderLeft,
          borderRight: style.borderRight,
        });
      }
    });
    return borders;
  }

  /* ── 18. Collect Navigation Structure ── */
  function collectNavigation() {
    const navs = [];
    document.querySelectorAll("nav,header nav,[role='navigation'],.navbar,.nav,.navigation,.menu").forEach((nav, ni) => {
      const links = [];
      nav.querySelectorAll("a").forEach((a) => {
        links.push({
          text: a.textContent.trim().substring(0, 50),
          href: a.getAttribute("href") || "",
          classes: a.className || "",
          hasDropdown: !!a.closest(".dropdown,.has-submenu,[data-toggle]") || !!a.nextElementSibling,
        });
      });
      const style = getComputedStyle(nav);
      navs.push({
        id: nav.id || ("nav_" + ni),
        classes: nav.className || "",
        display: style.display,
        flexDirection: style.flexDirection,
        backgroundColor: style.backgroundColor,
        links,
      });
    });
    return navs;
  }

  /* ── 19. Collect Table Data ── */
  function collectTableData() {
    const tables = [];
    document.querySelectorAll("table").forEach((table, ti) => {
      const headers = [];
      table.querySelectorAll("thead th, thead td, tr:first-child th").forEach((th) => {
        headers.push(th.textContent.trim());
      });
      const rows = [];
      table.querySelectorAll("tbody tr, tr").forEach((tr) => {
        if (rows.length > 50) return;
        const cells = [];
        tr.querySelectorAll("td,th").forEach((td) => {
          cells.push(td.textContent.trim().substring(0, 100));
        });
        if (cells.length > 0 && cells.some((c) => c)) rows.push(cells);
      });
      const style = getComputedStyle(table);
      tables.push({
        id: table.id || ("table_" + ti),
        headers,
        rows: rows.slice(0, 50),
        classes: table.className || "",
        borderCollapse: style.borderCollapse,
        width: style.width,
      });
    });
    return tables.slice(0, 10);
  }

  /* ── 20. Collect Image Inventory ── */
  function collectImageInventory() {
    const images = [];
    document.querySelectorAll("img").forEach((img) => {
      if (images.length > 60) return;
      images.push({
        src: img.src || "",
        alt: img.alt || "",
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0,
        loading: img.loading || "eager",
        srcset: img.srcset || "",
        classes: img.className || "",
        isLazy: img.loading === "lazy" || !!img.dataset.src || !!img.dataset.lazySrc,
      });
    });
    return images;
  }

  /* ── 21. Collect Z-Index Map ── */
  function collectZIndexMap() {
    const zmap = [];
    document.querySelectorAll("body *").forEach((el) => {
      if (zmap.length > 30) return;
      const style = getComputedStyle(el);
      const z = parseInt(style.zIndex);
      if (!isNaN(z) && z !== 0 && style.position !== "static") {
        zmap.push({
          selector: getSelector(el),
          zIndex: z,
          position: style.position,
          tag: el.tagName.toLowerCase(),
        });
      }
    });
    zmap.sort((a, b) => b.zIndex - a.zIndex);
    return zmap;
  }

  /* ── 22. Collect Custom Data Attributes ── */
  function collectDataAttributes() {
    const attrs = {};
    document.querySelectorAll("[data-*]").forEach((el) => {
      if (Object.keys(attrs).length > 50) return;
      for (const key of Object.keys(el.dataset)) {
        if (!attrs[key]) attrs[key] = { count: 0, examples: [] };
        attrs[key].count++;
        if (attrs[key].examples.length < 3) {
          attrs[key].examples.push(el.dataset[key].substring(0, 50));
        }
      }
    });
    return attrs;
  }

  /* ── 23. Collect Social Media Links ── */
  function collectSocialLinks() {
    const socialPatterns = [
      { name: "Facebook", pattern: /facebook\.com|fb\.com|fb\.me/i },
      { name: "Twitter/X", pattern: /twitter\.com|x\.com/i },
      { name: "Instagram", pattern: /instagram\.com/i },
      { name: "LinkedIn", pattern: /linkedin\.com/i },
      { name: "YouTube", pattern: /youtube\.com|youtu\.be/i },
      { name: "GitHub", pattern: /github\.com/i },
      { name: "TikTok", pattern: /tiktok\.com/i },
      { name: "Pinterest", pattern: /pinterest\.com/i },
      { name: "Reddit", pattern: /reddit\.com/i },
      { name: "Discord", pattern: /discord\.gg|discord\.com/i },
      { name: "Telegram", pattern: /t\.me|telegram\.me/i },
      { name: "WhatsApp", pattern: /wa\.me|whatsapp\.com/i },
      { name: "Snapchat", pattern: /snapchat\.com/i },
      { name: "Twitch", pattern: /twitch\.tv/i },
      { name: "Medium", pattern: /medium\.com/i },
      { name: "Dribbble", pattern: /dribbble\.com/i },
      { name: "Behance", pattern: /behance\.net/i },
    ];
    const found = [];
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      for (const sp of socialPatterns) {
        if (sp.pattern.test(href) && !found.some((f) => f.name === sp.name && f.url === href)) {
          found.push({ name: sp.name, url: href, text: a.textContent.trim().substring(0, 30) });
        }
      }
    });
    return found;
  }

  /* ── 24. Collect Page Text Content ── */
  function collectTextContent() {
    const sections = [];
    document.querySelectorAll("header,main,section,article,aside,footer,.hero,.content,.container").forEach((el) => {
      if (sections.length > 20) return;
      const text = el.innerText || el.textContent || "";
      if (text.trim().length > 10) {
        sections.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || "",
          classes: el.className && typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 3).join(" ") : "",
          text: text.trim().substring(0, 500),
        });
      }
    });
    return sections;
  }

  /* ── 25. Collect Scroll & Overflow Behaviors ── */
  function collectScrollBehaviors() {
    const behaviors = [];
    document.querySelectorAll("body *").forEach((el) => {
      if (behaviors.length > 20) return;
      const style = getComputedStyle(el);
      const overflow = style.overflow + style.overflowX + style.overflowY;
      const snapType = style.scrollSnapType;
      const scrollBehavior = style.scrollBehavior;
      if ((overflow.includes("scroll") || overflow.includes("auto")) && el.scrollHeight > el.clientHeight + 10) {
        behaviors.push({
          selector: getSelector(el),
          overflow: style.overflow,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          scrollSnapType: snapType !== "none" ? snapType : "",
          scrollBehavior: scrollBehavior !== "auto" ? scrollBehavior : "",
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
        });
      }
    });
    return behaviors;
  }

  /* ── 26. Collect Color Palette as CSS Variables ── */
  function collectColorPalette() {
    const colorMap = {};
    const colorProps = ["color", "backgroundColor", "borderColor", "borderTopColor", "borderBottomColor", "borderLeftColor", "borderRightColor", "outlineColor"];
    document.querySelectorAll("body *").forEach((el) => {
      if (Object.keys(colorMap).length > 60) return;
      const style = getComputedStyle(el);
      colorProps.forEach((prop) => {
        const val = style[prop];
        if (val && val !== "rgba(0, 0, 0, 0)" && val !== "rgb(0, 0, 0)" && val !== "transparent" && val !== "inherit") {
          if (!colorMap[val]) colorMap[val] = { count: 0, usage: prop };
          colorMap[val].count++;
        }
      });
    });
    return colorMap;
  }

  /* ── 27. Collect Flexbox & Grid Layouts ── */
  function collectFlexGridLayouts() {
    const layouts = [];
    document.querySelectorAll("body *").forEach((el) => {
      if (layouts.length > 40) return;
      const style = getComputedStyle(el);
      if (style.display === "flex" || style.display === "inline-flex") {
        layouts.push({
          selector: getSelector(el),
          type: "flexbox",
          display: style.display,
          flexDirection: style.flexDirection,
          flexWrap: style.flexWrap,
          justifyContent: style.justifyContent,
          alignItems: style.alignItems,
          gap: style.gap,
          children: el.children.length,
        });
      } else if (style.display === "grid" || style.display === "inline-grid") {
        layouts.push({
          selector: getSelector(el),
          type: "grid",
          display: style.display,
          gridTemplateColumns: style.gridTemplateColumns,
          gridTemplateRows: style.gridTemplateRows,
          gap: style.gap,
          gridAutoFlow: style.gridAutoFlow,
          children: el.children.length,
        });
      }
    });
    return layouts;
  }

  /* ── 28. Collect Link Map / Sitemap ── */
  function collectLinkMap() {
    const internal = [];
    const external = [];
    const anchors = [];
    const mailto = [];
    const tel = [];
    const currentHost = window.location.hostname;
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const text = a.textContent.trim().substring(0, 60);
      if (href.startsWith("#")) {
        anchors.push({ href, text });
      } else if (href.startsWith("mailto:")) {
        mailto.push({ href: href.replace("mailto:", ""), text });
      } else if (href.startsWith("tel:")) {
        tel.push({ href: href.replace("tel:", ""), text });
      } else {
        try {
          const url = new URL(href, window.location.href);
          if (url.hostname === currentHost) {
            if (!internal.some((l) => l.href === url.pathname)) {
              internal.push({ href: url.pathname, text });
            }
          } else {
            if (!external.some((l) => l.href === url.href)) {
              external.push({ href: url.href, text, domain: url.hostname });
            }
          }
        } catch (_) {}
      }
    });
    return { internal: internal.slice(0, 50), external: external.slice(0, 50), anchors: anchors.slice(0, 30), mailto, tel };
  }

  /* ── 29. Collect Icon Classes ── */
  function collectIconClasses() {
    const icons = [];
    const iconPatterns = [
      { lib: "Font Awesome", selector: ".fa,.fas,.far,.fab,.fal,.fad,.fass,[class*='fa-']", getIcon: (el) => [...el.classList].find((c) => c.startsWith("fa-") && c !== "fa-") || "" },
      { lib: "Material Icons", selector: ".material-icons,.material-icons-outlined,.material-icons-round,.material-symbols-outlined", getIcon: (el) => el.textContent.trim() },
      { lib: "Bootstrap Icons", selector: "[class*='bi-']", getIcon: (el) => [...el.classList].find((c) => c.startsWith("bi-")) || "" },
      { lib: "Heroicons", selector: "[class*='heroicon']", getIcon: (el) => [...el.classList].find((c) => c.includes("heroicon")) || "" },
      { lib: "Lucide", selector: "[class*='lucide-']", getIcon: (el) => [...el.classList].find((c) => c.startsWith("lucide-")) || "" },
    ];
    iconPatterns.forEach(({ lib, selector, getIcon }) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (icons.length > 80) return;
        const icon = getIcon(el);
        if (icon && !icons.some((i) => i.icon === icon && i.lib === lib)) {
          icons.push({ lib, icon, tag: el.tagName.toLowerCase() });
        }
      });
    });
    return icons;
  }

  /* ── 30. Collect Page Size Analysis ── */
  function collectPageSize() {
    const html = document.documentElement.outerHTML;
    const htmlSize = new Blob([html]).size;
    const nodeCount = document.querySelectorAll("*").length;
    const textLength = document.body.innerText.length;
    const perfEntries = performance.getEntriesByType("resource");
    let totalTransferred = 0;
    const byType = {};
    perfEntries.forEach((e) => {
      totalTransferred += e.transferSize || 0;
      const ext = (e.name.split("?")[0].split(".").pop() || "other").toLowerCase();
      if (!byType[ext]) byType[ext] = { count: 0, size: 0 };
      byType[ext].count++;
      byType[ext].size += e.transferSize || 0;
    });
    return { htmlSize, totalTransferred, nodeCount, textLength, resourceCount: perfEntries.length, byType };
  }

  /* ── 31. Collect External API Endpoints ── */
  function collectAPIEndpoints() {
    const endpoints = new Set();
    document.querySelectorAll("script:not([src])").forEach((script) => {
      const code = script.textContent || "";
      const fetchMatches = code.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];
      fetchMatches.forEach((m) => {
        const url = m.match(/['"`]([^'"`]+)['"`]/);
        if (url && url[1]) endpoints.add(url[1]);
      });
      const xhrMatches = code.match(/\.open\s*\(\s*['"`]\w+['"`]\s*,\s*['"`]([^'"`]+)['"`]/g) || [];
      xhrMatches.forEach((m) => {
        const url = m.match(/,\s*['"`]([^'"`]+)['"`]/);
        if (url && url[1]) endpoints.add(url[1]);
      });
      const apiMatches = code.match(/['"`](\/api\/[^'"`]+)['"`]/g) || [];
      apiMatches.forEach((m) => {
        const url = m.match(/['"`]([^'"`]+)['"`]/);
        if (url && url[1]) endpoints.add(url[1]);
      });
    });
    return [...endpoints].slice(0, 30);
  }

  /* ── 32. Collect LocalStorage Keys ── */
  function collectStorageKeys() {
    const ls = {};
    const ss = {};
    try {
      for (let i = 0; i < localStorage.length && i < 30; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
        ls[key] = val ? val.substring(0, 100) : "";
      }
    } catch (_) {}
    try {
      for (let i = 0; i < sessionStorage.length && i < 20; i++) {
        const key = sessionStorage.key(i);
        const val = sessionStorage.getItem(key);
        ss[key] = val ? val.substring(0, 100) : "";
      }
    } catch (_) {}
    return { localStorage: ls, sessionStorage: ss };
  }

  /* ── 33. Collect Spacing Scale ── */
  function collectSpacingScale() {
    const margins = {};
    const paddings = {};
    const gaps = {};
    document.querySelectorAll("body *").forEach((el) => {
      const style = getComputedStyle(el);
      [style.marginTop, style.marginRight, style.marginBottom, style.marginLeft].forEach((m) => {
        if (m && m !== "0px" && m !== "auto") { margins[m] = (margins[m] || 0) + 1; }
      });
      [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].forEach((p) => {
        if (p && p !== "0px") { paddings[p] = (paddings[p] || 0) + 1; }
      });
      if (style.gap && style.gap !== "normal" && style.gap !== "0px") {
        gaps[style.gap] = (gaps[style.gap] || 0) + 1;
      }
    });
    const sortByCount = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([val, count]) => ({ value: val, count }));
    return { margins: sortByCount(margins), paddings: sortByCount(paddings), gaps: sortByCount(gaps) };
  }

  /* ── 34. Collect OG / Social Preview ── */
  function collectSocialPreview() {
    const og = {};
    document.querySelectorAll("meta[property^='og:']").forEach((m) => {
      og[m.getAttribute("property")] = m.getAttribute("content") || "";
    });
    const twitter = {};
    document.querySelectorAll("meta[name^='twitter:']").forEach((m) => {
      twitter[m.getAttribute("name")] = m.getAttribute("content") || "";
    });
    return { og, twitter, title: document.title, description: (document.querySelector("meta[name='description']") || {}).content || "" };
  }

  /* ── 35. Collect DOM Element Inventory ── */
  function collectElementInventory() {
    const counts = {};
    document.querySelectorAll("body *").forEach((el) => {
      const tag = el.tagName.toLowerCase();
      counts[tag] = (counts[tag] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
  }

  /* ── 36. Collect Transition Properties ── */
  function collectTransitions() {
    const transitions = [];
    const seen = new Set();
    document.querySelectorAll("body *").forEach((el) => {
      if (transitions.length > 30) return;
      const style = getComputedStyle(el);
      const t = style.transition;
      if (t && t !== "all 0s ease 0s" && t !== "none 0s ease 0s" && t !== "none" && !seen.has(t)) {
        seen.add(t);
        transitions.push({ selector: getSelector(el), transition: t });
      }
    });
    return transitions;
  }

  /* ── 37. Collect Canvas & WebGL Elements ── */
  function collectCanvasElements() {
    const canvases = [];
    document.querySelectorAll("canvas").forEach((c) => {
      canvases.push({
        id: c.id || "",
        width: c.width,
        height: c.height,
        classes: c.className || "",
      });
    });
    return canvases;
  }

  /* ── Helper: generate a CSS selector for an element ── */
  function getSelector(el) {
    if (el.id) return "#" + el.id;
    let sel = el.tagName.toLowerCase();
    if (el.className && typeof el.className === "string") {
      sel += "." + el.className.trim().split(/\s+/).slice(0, 2).join(".");
    }
    return sel;
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

  /* ── Security Scanner ── */
  function analyzeSecurity() {
    const results = [];
    const isHttps = window.location.protocol === "https:";
    results.push({ pass: isHttps, text: isHttps ? "Site uses HTTPS (secure connection)" : "Site uses HTTP (not secure!)" });

    // Mixed content check
    const mixedContent = [];
    document.querySelectorAll("img[src^='http:'],script[src^='http:'],link[href^='http:']").forEach((el) => {
      if (isHttps) mixedContent.push(el.tagName + ": " + (el.src || el.href));
    });
    if (isHttps) {
      results.push(mixedContent.length === 0
        ? { pass: true, text: "No mixed content detected" }
        : { pass: false, text: mixedContent.length + " mixed content items found (HTTP resources on HTTPS page)" });
    }

    // Check for common security headers via meta tags
    const csp = document.querySelector("meta[http-equiv='Content-Security-Policy']");
    results.push(csp
      ? { pass: true, text: "Content-Security-Policy found (via meta)" }
      : { pass: "warn", text: "No Content-Security-Policy meta tag" });

    const xframe = document.querySelector("meta[http-equiv='X-Frame-Options']");
    if (xframe) results.push({ pass: true, text: "X-Frame-Options set" });

    // External script analysis
    const externalScripts = [...document.querySelectorAll("script[src]")].map((s) => s.src);
    const thirdPartyScripts = externalScripts.filter((s) => {
      try { return new URL(s).hostname !== window.location.hostname; } catch (_) { return false; }
    });
    results.push({ pass: "warn", text: thirdPartyScripts.length + " third-party scripts loaded" });

    // Inline scripts
    const inlineScripts = document.querySelectorAll("script:not([src])");
    results.push(inlineScripts.length <= 5
      ? { pass: true, text: inlineScripts.length + " inline scripts" }
      : { pass: "warn", text: inlineScripts.length + " inline scripts (may increase XSS risk)" });

    // Forms check
    const insecureForms = document.querySelectorAll("form[action^='http:']");
    if (insecureForms.length > 0) {
      results.push({ pass: false, text: insecureForms.length + " form(s) submit to insecure HTTP URL" });
    }

    // Password fields check
    const pwdFields = document.querySelectorAll("input[type='password']");
    if (pwdFields.length > 0 && !isHttps) {
      results.push({ pass: false, text: "Password field on non-HTTPS page!" });
    }

    // SRI check on scripts
    const scriptsWithSRI = [...document.querySelectorAll("script[src][integrity]")].length;
    const scriptsTotal = externalScripts.length;
    if (scriptsTotal > 0) {
      results.push(scriptsWithSRI > 0
        ? { pass: true, text: scriptsWithSRI + "/" + scriptsTotal + " scripts have SRI integrity" }
        : { pass: "warn", text: "No scripts use Subresource Integrity (SRI)" });
    }

    const passed = results.filter((r) => r.pass === true).length;
    const total = results.length;
    const score = Math.round((passed / total) * 100);

    return { results, score, mixedContent: mixedContent.slice(0, 10), thirdPartyScripts: thirdPartyScripts.slice(0, 15) };
  }

  /* ── Cookie & Tracker Detector ── */
  function detectCookiesAndTrackers() {
    // Cookies
    const cookieStr = document.cookie || "";
    const cookies = cookieStr ? cookieStr.split(";").map((c) => c.trim()).filter(Boolean) : [];
    const cookieList = cookies.map((c) => {
      const [name] = c.split("=");
      return { name: name.trim(), value: c.substring(c.indexOf("=") + 1).substring(0, 50) };
    });

    // Known trackers detection
    const trackerSignatures = [
      { name: "Google Analytics", test: () => !!window.ga || !!window.gtag || !!document.querySelector("script[src*='google-analytics.com'],script[src*='googletagmanager.com']") },
      { name: "Google Tag Manager", test: () => !!window.google_tag_manager || !!document.querySelector("script[src*='googletagmanager.com/gtm']") },
      { name: "Facebook Pixel", test: () => !!window.fbq || !!document.querySelector("script[src*='connect.facebook.net']") },
      { name: "Hotjar", test: () => !!window.hj || !!document.querySelector("script[src*='hotjar.com']") },
      { name: "Mixpanel", test: () => !!window.mixpanel || !!document.querySelector("script[src*='mixpanel.com']") },
      { name: "Segment", test: () => !!window.analytics || !!document.querySelector("script[src*='segment.com']") },
      { name: "Amplitude", test: () => !!window.amplitude || !!document.querySelector("script[src*='amplitude.com']") },
      { name: "Intercom", test: () => !!window.Intercom || !!document.querySelector("script[src*='intercom.io']") },
      { name: "Drift", test: () => !!window.drift || !!document.querySelector("script[src*='drift.com']") },
      { name: "Crisp", test: () => !!window.$crisp || !!document.querySelector("script[src*='crisp.chat']") },
      { name: "Tawk.to", test: () => !!window.Tawk_API || !!document.querySelector("script[src*='tawk.to']") },
      { name: "Clarity", test: () => !!window.clarity || !!document.querySelector("script[src*='clarity.ms']") },
      { name: "Pinterest Tag", test: () => !!window.pintrk || !!document.querySelector("script[src*='pintrk']") },
      { name: "LinkedIn Insight", test: () => !!window._linkedin_data_partner_ids || !!document.querySelector("script[src*='snap.licdn.com']") },
      { name: "Twitter Pixel", test: () => !!window.twq || !!document.querySelector("script[src*='static.ads-twitter.com']") },
      { name: "TikTok Pixel", test: () => !!window.ttq || !!document.querySelector("script[src*='analytics.tiktok.com']") },
      { name: "Heap Analytics", test: () => !!window.heap || !!document.querySelector("script[src*='heap-analytics']") },
      { name: "FullStory", test: () => !!window.FS || !!document.querySelector("script[src*='fullstory.com']") },
      { name: "Sentry", test: () => !!window.Sentry || !!document.querySelector("script[src*='sentry.io']") },
      { name: "Cloudflare", test: () => !!document.querySelector("script[src*='cloudflare']") },
    ];

    const detectedTrackers = [];
    trackerSignatures.forEach((sig) => {
      try { if (sig.test()) detectedTrackers.push(sig.name); } catch (_) {}
    });

    // LocalStorage and SessionStorage item counts
    let localStorageCount = 0;
    let sessionStorageCount = 0;
    try { localStorageCount = localStorage.length; } catch (_) {}
    try { sessionStorageCount = sessionStorage.length; } catch (_) {}

    return {
      cookies: cookieList.slice(0, 30),
      cookieCount: cookies.length,
      trackers: detectedTrackers,
      localStorageCount,
      sessionStorageCount,
    };
  }

  /* ── Accessibility Checker ── */
  function checkAccessibility() {
    const issues = [];

    // Images without alt
    const imgNoAlt = document.querySelectorAll("img:not([alt])");
    const imgEmptyAlt = document.querySelectorAll("img[alt='']");
    if (imgNoAlt.length > 0) issues.push({ severity: "error", text: imgNoAlt.length + " image(s) missing alt attribute" });
    if (imgEmptyAlt.length > 0) issues.push({ severity: "warn", text: imgEmptyAlt.length + " image(s) with empty alt (decorative?)" });

    // Missing form labels
    const inputs = document.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']),textarea,select");
    let unlabeled = 0;
    inputs.forEach((input) => {
      const id = input.id;
      const hasLabel = id && document.querySelector("label[for='" + id + "']");
      const wrappedInLabel = input.closest("label");
      const hasAriaLabel = input.getAttribute("aria-label") || input.getAttribute("aria-labelledby");
      if (!hasLabel && !wrappedInLabel && !hasAriaLabel) unlabeled++;
    });
    if (unlabeled > 0) issues.push({ severity: "error", text: unlabeled + " form input(s) without labels" });
    else if (inputs.length > 0) issues.push({ severity: "pass", text: "All form inputs have labels" });

    // Heading hierarchy
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];
    const headingLevels = headings.map((h) => parseInt(h.tagName[1]));
    let skippedLevels = false;
    for (let i = 1; i < headingLevels.length; i++) {
      if (headingLevels[i] - headingLevels[i - 1] > 1) { skippedLevels = true; break; }
    }
    if (skippedLevels) issues.push({ severity: "warn", text: "Heading levels are skipped (bad hierarchy)" });
    else if (headings.length > 0) issues.push({ severity: "pass", text: "Heading hierarchy is correct" });

    // Language attribute
    const lang = document.documentElement.lang;
    issues.push(lang
      ? { severity: "pass", text: "HTML lang attribute is set (" + lang + ")" }
      : { severity: "error", text: "Missing HTML lang attribute" });

    // ARIA landmarks
    const landmarks = document.querySelectorAll("[role='main'],main,[role='navigation'],nav,[role='banner'],header,[role='contentinfo'],footer");
    issues.push(landmarks.length > 0
      ? { severity: "pass", text: landmarks.length + " ARIA landmarks/semantic elements found" }
      : { severity: "warn", text: "No ARIA landmarks or semantic HTML5 elements found" });

    // Tab index misuse
    const badTabIndex = document.querySelectorAll("[tabindex]:not([tabindex='0']):not([tabindex='-1'])");
    if (badTabIndex.length > 0) issues.push({ severity: "warn", text: badTabIndex.length + " element(s) with positive tabindex (disrupts tab order)" });

    // Link text
    const emptyLinks = document.querySelectorAll("a:not([aria-label])");
    let emptyLinkCount = 0;
    emptyLinks.forEach((a) => { if (!a.textContent.trim() && !a.querySelector("img[alt]")) emptyLinkCount++; });
    if (emptyLinkCount > 0) issues.push({ severity: "error", text: emptyLinkCount + " link(s) with no text or aria-label" });

    // Button text
    const buttons = document.querySelectorAll("button");
    let emptyButtons = 0;
    buttons.forEach((b) => {
      if (!b.textContent.trim() && !b.getAttribute("aria-label") && !b.querySelector("img[alt],svg[aria-label]")) emptyButtons++;
    });
    if (emptyButtons > 0) issues.push({ severity: "warn", text: emptyButtons + " button(s) without accessible text" });

    // Contrast - basic check (font size < 14px with low opacity)
    const smallText = document.querySelectorAll("p,span,a,li,td,th,label");
    let lowContrastSuspects = 0;
    for (let i = 0; i < Math.min(smallText.length, 100); i++) {
      const style = window.getComputedStyle(smallText[i]);
      const color = style.color;
      const bg = style.backgroundColor;
      if (color && bg && color === bg) lowContrastSuspects++;
    }
    if (lowContrastSuspects > 0) issues.push({ severity: "warn", text: lowContrastSuspects + " element(s) may have zero contrast" });

    const errors = issues.filter((i) => i.severity === "error").length;
    const warns = issues.filter((i) => i.severity === "warn").length;
    const passes = issues.filter((i) => i.severity === "pass").length;
    const total = errors + warns + passes;
    const score = total > 0 ? Math.round((passes / total) * 100) : 0;

    return { issues, score, errors, warns, passes };
  }

  /* ── Link Checker & Page Structure ── */
  function analyzeStructure() {
    // Links
    const allLinks = [...document.querySelectorAll("a[href]")];
    const hostname = window.location.hostname;
    let internal = 0, external = 0, hash = 0, mailto = 0, tel = 0;
    const externalDomains = new Set();

    allLinks.forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (href.startsWith("#")) hash++;
      else if (href.startsWith("mailto:")) mailto++;
      else if (href.startsWith("tel:")) tel++;
      else {
        try {
          const url = new URL(href, window.location.href);
          if (url.hostname === hostname) internal++;
          else { external++; externalDomains.add(url.hostname); }
        } catch (_) { internal++; }
      }
    });

    // Headings structure
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
      tag: h.tagName,
      text: h.textContent.trim().substring(0, 60),
    }));

    // Page structure info
    const structure = {
      doctype: document.doctype ? "<!DOCTYPE " + document.doctype.name + ">" : "Missing",
      domElements: document.querySelectorAll("*").length,
      iframes: document.querySelectorAll("iframe").length,
      forms: document.querySelectorAll("form").length,
      tables: document.querySelectorAll("table").length,
      videos: document.querySelectorAll("video").length,
      audios: document.querySelectorAll("audio").length,
      canvases: document.querySelectorAll("canvas").length,
      svgs: document.querySelectorAll("svg").length,
    };

    return {
      links: { total: allLinks.length, internal, external, hash, mailto, tel },
      externalDomains: [...externalDomains].slice(0, 20),
      headings: headings.slice(0, 30),
      structure,
    };
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
        fonts: collectFontFiles().length,
        svgs: document.querySelectorAll("svg").length,
        forms: document.querySelectorAll("form").length,
        iframes: document.querySelectorAll("iframe").length,
        videos: document.querySelectorAll("video").length,
        audios: document.querySelectorAll("audio").length,
        tables: document.querySelectorAll("table").length,
        buttons: document.querySelectorAll("button,a[role='button'],[type='submit'],[type='button']").length,
      },
      html: document.documentElement.outerHTML,
      downloadResources: collectDownloadResources(),
      fontFiles: collectFontFiles(),
      inlineSVGs: collectInlineSVGs(),
      cssVariables: collectCSSVariables(),
      animations: collectAnimations(),
      mediaQueries: collectMediaQueries(),
      formElements: collectFormElements(),
      interactiveElements: collectInteractiveElements(),
      backgrounds: collectBackgrounds(),
      faviconsAndManifest: collectFaviconsAndManifest(),
      mediaSources: collectMediaSources(),
      computedStyles: collectComputedStyles(),
      layoutMap: collectLayoutMap(),
      iframeSources: collectIframeSources(),
      structuredData: collectStructuredData(),
      typography: collectTypography(),
      shadows: collectShadows(),
      borders: collectBorders(),
      navigation: collectNavigation(),
      tableData: collectTableData(),
      imageInventory: collectImageInventory(),
      zIndexMap: collectZIndexMap(),
      dataAttributes: collectDataAttributes(),
      socialLinks: collectSocialLinks(),
      textContent: collectTextContent(),
      scrollBehaviors: collectScrollBehaviors(),
      colorPalette: collectColorPalette(),
      flexGridLayouts: collectFlexGridLayouts(),
      linkMap: collectLinkMap(),
      iconClasses: collectIconClasses(),
      pageSize: collectPageSize(),
      apiEndpoints: collectAPIEndpoints(),
      storageKeys: collectStorageKeys(),
      spacingScale: collectSpacingScale(),
      socialPreview: collectSocialPreview(),
      elementInventory: collectElementInventory(),
      transitions: collectTransitions(),
      canvasElements: collectCanvasElements(),
      workingCloneData: collectWorkingCloneData(),
      seo: analyzeSEO(),
      performance: analyzePerformance(),
      security: analyzeSecurity(),
      tracking: detectCookiesAndTrackers(),
      accessibility: checkAccessibility(),
      pageStructure: analyzeStructure(),
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
