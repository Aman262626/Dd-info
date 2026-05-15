/* Dd-info Popup Script — handles UI rendering and source code download */

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let siteData = null;

  /* ── Initialize ── */
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    setupCollapsibles();
    setupDownloadButton();

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
        showError("Cannot analyze Chrome internal pages. Navigate to a website first.");
        return;
      }

      // Inject content script if not already injected
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        });
      } catch (_) {
        // Script might already be injected
      }

      // Small delay to let content script initialize
      await new Promise((r) => setTimeout(r, 300));

      chrome.tabs.sendMessage(tab.id, { action: "analyze" }, (response) => {
        if (chrome.runtime.lastError) {
          showError("Could not connect to page. Try refreshing the page and reopening the extension.");
          return;
        }
        if (!response || !response.success) {
          showError(response?.error || "Failed to analyze the page.");
          return;
        }
        siteData = response.data;
        renderData(siteData);
      });
    } catch (err) {
      showError("Error: " + err.message);
    }
  }

  /* ── Render all data ── */
  function renderData(data) {
    $("#loading").style.display = "none";
    $("#content").style.display = "block";

    // Basic info
    $("#site-title").textContent = data.title;
    $("#site-url").textContent = truncate(data.url, 60);
    $("#site-desc").textContent = truncate(data.description, 120);
    $("#site-lang").textContent = data.language;
    $("#site-charset").textContent = data.charset;
    $("#site-viewport").textContent = truncate(data.viewport, 80);

    // Tech stack
    renderTechStack(data.techStack);

    // Fonts
    renderFonts(data.fonts);

    // Colors
    renderColors(data.colors);

    // Resources
    renderResources(data.resources);

    // Meta tags
    renderMeta(data.metaTags);

    // Stats
    $("#stat-css").textContent = data.stats.cssFiles;
    $("#stat-js").textContent = data.stats.jsFiles;
    $("#stat-img").textContent = data.stats.images;
    $("#stat-links").textContent = data.stats.links;
  }

  /* ── Render tech stack ── */
  function renderTechStack(stack) {
    const container = $("#tech-stack");
    container.innerHTML = "";

    if (!stack.length) {
      container.innerHTML = '<span class="tag empty">No frameworks detected</span>';
      return;
    }

    const icons = {
      "React": "\u269b\ufe0f",
      "Next.js": "\u25b2",
      "Vue.js": "\ud83d\udc9a",
      "Nuxt.js": "\ud83d\udc9a",
      "Angular": "\ud83c\udfa8",
      "Svelte": "\ud83d\udd25",
      "jQuery": "\ud83d\udcdc",
      "Bootstrap": "\ud83c\udf1f",
      "Tailwind CSS": "\ud83c\udf2c\ufe0f",
      "WordPress": "\ud83d\udcdd",
      "Google Analytics": "\ud83d\udcca",
      "PWA": "\ud83d\udcf1",
      "Firebase": "\ud83d\udd25",
    };

    stack.forEach((tech) => {
      const tag = document.createElement("span");
      tag.className = "tag tech";
      const icon = icons[tech] || "\u2699\ufe0f";
      tag.textContent = icon + " " + tech;
      container.appendChild(tag);
    });
  }

  /* ── Render fonts ── */
  function renderFonts(fonts) {
    const container = $("#fonts-list");
    container.innerHTML = "";

    if (!fonts.length) {
      container.innerHTML = '<span class="tag empty">No custom fonts detected</span>';
      return;
    }

    fonts.forEach((font) => {
      const tag = document.createElement("span");
      tag.className = "tag font";
      tag.textContent = "\ud83d\udd24 " + font;
      container.appendChild(tag);
    });
  }

  /* ── Render colors ── */
  function renderColors(colors) {
    const container = $("#colors-list");
    container.innerHTML = "";

    if (!colors.length) {
      container.innerHTML = '<span class="tag empty">No colors detected</span>';
      return;
    }

    colors.forEach((hex) => {
      const swatch = document.createElement("div");
      swatch.className = "color-swatch";
      swatch.innerHTML =
        '<div class="color-box" style="background:' + hex + '"></div>' +
        '<span class="color-hex">' + hex + "</span>";
      swatch.addEventListener("click", () => {
        navigator.clipboard.writeText(hex);
        swatch.querySelector(".color-hex").textContent = "Copied!";
        setTimeout(() => {
          swatch.querySelector(".color-hex").textContent = hex;
        }, 1000);
      });
      swatch.style.cursor = "pointer";
      swatch.title = "Click to copy";
      container.appendChild(swatch);
    });
  }

  /* ── Render resources ── */
  function renderResources(resources) {
    const container = $("#resources-list");
    container.innerHTML = "";

    if (!resources.length) {
      container.innerHTML = '<span class="tag empty">No external resources</span>';
      return;
    }

    resources.forEach((res) => {
      const item = document.createElement("div");
      item.className = "resource-item";
      item.innerHTML =
        '<span class="resource-type">' + res.type + "</span>" + truncate(res.url, 60);
      container.appendChild(item);
    });
  }

  /* ── Render meta tags ── */
  function renderMeta(metas) {
    const container = $("#meta-tags");
    container.innerHTML = "";

    if (!metas.length) {
      container.innerHTML = '<div class="meta-item"><span class="meta-value">No meta tags found</span></div>';
      return;
    }

    metas.forEach((meta) => {
      const item = document.createElement("div");
      item.className = "meta-item";
      item.innerHTML =
        '<span class="meta-name">' + escapeHtml(meta.name) + "</span>" +
        '<span class="meta-value">' + escapeHtml(truncate(meta.content, 100)) + "</span>";
      container.appendChild(item);
    });
  }

  /* ── Collapsible sections ── */
  function setupCollapsibles() {
    $$(".toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        const content = document.getElementById(target);
        if (content) {
          const isOpen = content.style.display !== "none";
          content.style.display = isOpen ? "none" : "block";
          btn.classList.toggle("open", !isOpen);
        }
      });
    });
  }

  /* ── Download source code as ZIP ── */
  function setupDownloadButton() {
    $("#download-btn").addEventListener("click", downloadSource);
  }

  async function downloadSource() {
    if (!siteData) return;

    const btn = $("#download-btn");
    const status = $("#download-status");
    btn.disabled = true;
    status.style.display = "block";
    status.className = "download-status progress";
    status.textContent = "Preparing download...";

    const includeHTML = $("#dl-html").checked;
    const includeCSS = $("#dl-css").checked;
    const includeJS = $("#dl-js").checked;
    const includeImages = $("#dl-images").checked;

    try {
      const zip = new JSZip();
      const hostname = new URL(siteData.url).hostname.replace(/[^a-z0-9.-]/gi, "_");

      // HTML
      if (includeHTML) {
        zip.file("index.html", siteData.html);
        status.textContent = "Added HTML...";
      }

      // CSS files
      if (includeCSS) {
        const cssFolder = zip.folder("css");
        let cssCount = 0;

        // External CSS
        for (const url of siteData.downloadResources.css) {
          try {
            const resp = await fetchResource(url);
            if (resp) {
              const filename = getFilename(url, "style_" + cssCount + ".css");
              cssFolder.file(filename, resp);
              cssCount++;
            }
          } catch (_) { /* skip failed downloads */ }
        }

        // Inline CSS
        siteData.downloadResources.inlineCSS.forEach((css, i) => {
          cssFolder.file("inline_style_" + i + ".css", css);
          cssCount++;
        });

        status.textContent = "Added " + cssCount + " CSS files...";
      }

      // JS files
      if (includeJS) {
        const jsFolder = zip.folder("js");
        let jsCount = 0;

        // External JS
        for (const url of siteData.downloadResources.js) {
          try {
            const resp = await fetchResource(url);
            if (resp) {
              const filename = getFilename(url, "script_" + jsCount + ".js");
              jsFolder.file(filename, resp);
              jsCount++;
            }
          } catch (_) { /* skip failed downloads */ }
        }

        // Inline JS
        siteData.downloadResources.inlineJS.forEach((js, i) => {
          jsFolder.file("inline_script_" + i + ".js", js);
          jsCount++;
        });

        status.textContent = "Added " + jsCount + " JS files...";
      }

      // Images
      if (includeImages) {
        const imgFolder = zip.folder("images");
        let imgCount = 0;

        for (const url of siteData.downloadResources.images.slice(0, 50)) {
          try {
            const resp = await fetchResourceBlob(url);
            if (resp) {
              const filename = getFilename(url, "image_" + imgCount + ".png");
              imgFolder.file(filename, resp);
              imgCount++;
            }
          } catch (_) { /* skip failed downloads */ }
        }

        status.textContent = "Added " + imgCount + " images...";
      }

      // Add a README
      zip.file("README.md",
        "# Source Code from " + hostname + "\n\n" +
        "Downloaded by **Dd-info** Chrome Extension\n\n" +
        "## Original URL\n" + siteData.url + "\n\n" +
        "## Tech Stack Detected\n" + (siteData.techStack.length ? siteData.techStack.map((t) => "- " + t).join("\n") : "- None detected") + "\n\n" +
        "## Fonts Used\n" + (siteData.fonts.length ? siteData.fonts.map((f) => "- " + f).join("\n") : "- Default fonts") + "\n\n" +
        "## Colors\n" + (siteData.colors.length ? siteData.colors.map((c) => "- " + c).join("\n") : "- Not detected") + "\n\n" +
        "## Structure\n" +
        "- `index.html` — Main page HTML\n" +
        "- `css/` — Stylesheets\n" +
        "- `js/` — JavaScript files\n" +
        "- `images/` — Image assets\n"
      );

      // Generate and download ZIP
      status.textContent = "Generating ZIP...";
      const blob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = hostname + "_source.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      status.className = "download-status success";
      status.textContent = "Download complete! Check your downloads folder.";
    } catch (err) {
      status.className = "download-status error";
      status.textContent = "Download failed: " + err.message;
    }

    btn.disabled = false;
  }

  /* ── Fetch resource as text ── */
  async function fetchResource(url) {
    try {
      const resp = await fetch(url, { mode: "cors" });
      if (!resp.ok) return null;
      return await resp.text();
    } catch (_) {
      return null;
    }
  }

  /* ── Fetch resource as blob ── */
  async function fetchResourceBlob(url) {
    try {
      const resp = await fetch(url, { mode: "cors" });
      if (!resp.ok) return null;
      return await resp.blob();
    } catch (_) {
      return null;
    }
  }

  /* ── Helpers ── */
  function getFilename(url, fallback) {
    try {
      const pathname = new URL(url).pathname;
      const parts = pathname.split("/");
      const name = parts[parts.length - 1];
      return name && name.length > 0 && name.includes(".") ? name : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function truncate(str, max) {
    if (!str || str === "—") return str;
    return str.length > max ? str.slice(0, max) + "..." : str;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ── Show error ── */
  function showError(msg) {
    $("#loading").style.display = "none";
    $("#error").style.display = "block";
    $("#error-msg").textContent = msg;
  }
})();
