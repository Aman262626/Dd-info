/* Dd-info Popup Script v2 — tabs, SEO, performance, AI chat, download, screenshot */

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let siteData = null;
  const API_KEY = "bc0f164a-d57d-4ba6-aa00-eec7b6ba137d";
  let chatHistory = [];

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    setupTabs();
    setupCollapsibles();
    setupDownloadButton();
    setupScreenshotButton();
    setupChat();

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
        showError("Cannot analyze Chrome internal pages. Navigate to a website first.");
        return;
      }

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        });
      } catch (_) { /* already injected */ }

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
        renderAll(siteData);
      });
    } catch (err) {
      showError("Error: " + err.message);
    }
  }

  /* ═══ TABS ═══ */
  function setupTabs() {
    $$(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".tab").forEach((t) => t.classList.remove("active"));
        $$(".tab-content").forEach((c) => { c.style.display = "none"; c.classList.remove("active"); });
        tab.classList.add("active");
        const target = document.getElementById(tab.dataset.tab);
        if (target) { target.style.display = "block"; target.classList.add("active"); }
      });
    });
  }

  /* ═══ RENDER ALL ═══ */
  function renderAll(data) {
    $("#loading").style.display = "none";
    $("#tab-info").style.display = "block";

    renderSiteInfo(data);
    renderTechStack(data.techStack);
    renderFonts(data.fonts);
    renderColors(data.colors);
    renderResources(data.resources);
    renderMeta(data.metaTags);
    renderStats(data.stats);
    renderSEO(data.seo);
    renderPerformance(data.performance);
  }

  /* ═══ SITE INFO ═══ */
  function renderSiteInfo(data) {
    $("#site-title").textContent = data.title;
    $("#site-url").textContent = truncate(data.url, 55);
    $("#site-desc").textContent = truncate(data.description, 100);
    $("#site-lang").textContent = data.language;
    $("#site-charset").textContent = data.charset;
    $("#site-viewport").textContent = truncate(data.viewport, 70);
  }

  function renderStats(stats) {
    $("#stat-css").textContent = stats.cssFiles;
    $("#stat-js").textContent = stats.jsFiles;
    $("#stat-img").textContent = stats.images;
    $("#stat-links").textContent = stats.links;
  }

  /* ═══ TECH STACK ═══ */
  function renderTechStack(stack) {
    const container = $("#tech-stack");
    container.innerHTML = "";
    if (!stack.length) { container.innerHTML = '<span class="tag empty">No frameworks detected</span>'; return; }
    stack.forEach((tech) => {
      const tag = document.createElement("span");
      tag.className = "tag tech";
      tag.textContent = tech;
      container.appendChild(tag);
    });
  }

  /* ═══ FONTS ═══ */
  function renderFonts(fonts) {
    const container = $("#fonts-list");
    container.innerHTML = "";
    if (!fonts.length) { container.innerHTML = '<span class="tag empty">No custom fonts</span>'; return; }
    fonts.forEach((font) => {
      const tag = document.createElement("span");
      tag.className = "tag font";
      tag.textContent = font;
      container.appendChild(tag);
    });
  }

  /* ═══ COLORS ═══ */
  function renderColors(colors) {
    const container = $("#colors-list");
    container.innerHTML = "";
    if (!colors.length) { container.innerHTML = '<span class="tag empty">No colors detected</span>'; return; }
    colors.forEach((hex) => {
      const swatch = document.createElement("div");
      swatch.className = "color-swatch";
      swatch.innerHTML = '<div class="color-box" style="background:' + hex + '"></div><span class="color-hex">' + hex + "</span>";
      swatch.style.cursor = "pointer";
      swatch.title = "Click to copy";
      swatch.addEventListener("click", () => {
        navigator.clipboard.writeText(hex);
        swatch.querySelector(".color-hex").textContent = "Copied!";
        setTimeout(() => { swatch.querySelector(".color-hex").textContent = hex; }, 1000);
      });
      container.appendChild(swatch);
    });
  }

  /* ═══ RESOURCES ═══ */
  function renderResources(resources) {
    const container = $("#resources-list");
    container.innerHTML = "";
    if (!resources.length) { container.innerHTML = '<span class="tag empty">No external resources</span>'; return; }
    resources.forEach((res) => {
      const item = document.createElement("div");
      item.className = "resource-item";
      item.innerHTML = '<span class="resource-type">' + res.type + "</span>" + truncate(res.url, 55);
      container.appendChild(item);
    });
  }

  /* ═══ META ═══ */
  function renderMeta(metas) {
    const container = $("#meta-tags");
    container.innerHTML = "";
    if (!metas.length) { container.innerHTML = '<div class="meta-item"><span class="meta-value">No meta tags</span></div>'; return; }
    metas.forEach((meta) => {
      const item = document.createElement("div");
      item.className = "meta-item";
      item.innerHTML = '<span class="meta-name">' + escapeHtml(meta.name) + "</span>" + '<span class="meta-value">' + escapeHtml(truncate(meta.content, 80)) + "</span>";
      container.appendChild(item);
    });
  }

  /* ═══ SEO ═══ */
  function renderSEO(seo) {
    if (!seo) return;

    // Score
    const scoreEl = $("#seo-score-val");
    const circleEl = $("#seo-score-circle");
    const labelEl = $("#seo-score-label");
    scoreEl.textContent = seo.score;

    if (seo.score >= 80) { circleEl.classList.add("good"); labelEl.textContent = "Excellent!"; }
    else if (seo.score >= 50) { circleEl.classList.add("ok"); labelEl.textContent = "Needs Work"; }
    else { circleEl.classList.add("bad"); labelEl.textContent = "Poor"; }

    // Checks
    const checksContainer = $("#seo-checks");
    checksContainer.innerHTML = "";
    seo.checks.forEach((check) => {
      const cls = check.pass === true ? "pass" : (check.pass === "warn" ? "warn" : "fail");
      const icon = check.pass === true ? "\u2714" : (check.pass === "warn" ? "\u26a0" : "\u2718");
      const el = document.createElement("div");
      el.className = "seo-check " + cls;
      el.innerHTML = '<span class="check-icon">' + icon + '</span><span class="check-text">' + escapeHtml(check.text) + "</span>";
      checksContainer.appendChild(el);
    });

    // OG tags
    const ogContainer = $("#og-tags");
    ogContainer.innerHTML = "";
    if (seo.ogData) {
      Object.entries(seo.ogData).forEach(([key, value]) => {
        const item = document.createElement("div");
        item.className = "info-item";
        item.innerHTML = '<span class="label">' + key + '</span><span class="value">' + escapeHtml(truncate(value, 60)) + "</span>";
        ogContainer.appendChild(item);
      });
    }
  }

  /* ═══ PERFORMANCE ═══ */
  function renderPerformance(perf) {
    if (!perf) return;

    $("#perf-load-time").textContent = perf.loadTime ? (perf.loadTime / 1000).toFixed(1) + "s" : "—";
    $("#perf-dom-ready").textContent = perf.domReady ? (perf.domReady / 1000).toFixed(1) + "s" : "—";
    $("#perf-resources").textContent = perf.resourceCount || "0";
    $("#perf-size").textContent = perf.totalSize ? formatBytes(perf.totalSize) : "—";

    // Breakdown bars
    const barsContainer = $("#perf-breakdown");
    barsContainer.innerHTML = "";

    if (perf.breakdown && perf.totalSize > 0) {
      const types = [
        { key: "js", label: "JavaScript", cls: "js-bar" },
        { key: "css", label: "CSS", cls: "css-bar" },
        { key: "img", label: "Images", cls: "img-bar" },
        { key: "font", label: "Fonts", cls: "font-bar" },
        { key: "other", label: "Other", cls: "other-bar" },
      ];

      types.forEach(({ key, label, cls }) => {
        const size = perf.sizes[key] || 0;
        const count = perf.breakdown[key] || 0;
        if (count === 0 && size === 0) return;
        const pct = Math.max(2, Math.round((size / perf.totalSize) * 100));

        const item = document.createElement("div");
        item.className = "perf-bar-item";
        item.innerHTML =
          '<div class="perf-bar-label"><span>' + label + " (" + count + ")</span><span>" + formatBytes(size) + "</span></div>" +
          '<div class="perf-bar-track"><div class="perf-bar-fill ' + cls + '" style="width:' + pct + '%"></div></div>';
        barsContainer.appendChild(item);
      });
    } else {
      barsContainer.innerHTML = '<p class="muted">No resource data available</p>';
    }

    // Tips
    const tipsContainer = $("#perf-tips");
    tipsContainer.innerHTML = "";
    if (perf.tips && perf.tips.length) {
      perf.tips.forEach((tip) => {
        const cls = tip.pass === true ? "pass" : (tip.pass === "warn" ? "warn" : "fail");
        const icon = tip.pass === true ? "\u2714" : (tip.pass === "warn" ? "\u26a0" : "\u2718");
        const el = document.createElement("div");
        el.className = "seo-check " + cls;
        el.innerHTML = '<span class="check-icon">' + icon + '</span><span class="check-text">' + escapeHtml(tip.text) + "</span>";
        tipsContainer.appendChild(el);
      });
    } else {
      tipsContainer.innerHTML = '<p class="muted">No tips available</p>';
    }
  }

  /* ═══ AI CHAT ═══ */
  function setupChat() {
    const input = $("#chat-input");
    const sendBtn = $("#chat-send");

    sendBtn.addEventListener("click", () => sendMessage());
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

    // Quick action buttons
    $$(".quick-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        input.value = btn.dataset.prompt;
        sendMessage();
      });
    });
  }

  async function sendMessage() {
    const input = $("#chat-input");
    const msg = input.value.trim();
    if (!msg) return;

    input.value = "";
    addChatMessage("user", msg);
    chatHistory.push({ role: "user", content: msg });

    // Show typing indicator
    const typingEl = addTypingIndicator();

    try {
      const siteContext = siteData ? {
        url: siteData.url,
        title: siteData.title,
        techStack: siteData.techStack || [],
        description: siteData.description || "",
        fonts: siteData.fonts || [],
        colors: siteData.colors || [],
        stats: siteData.stats || {},
        seoScore: siteData.seo ? siteData.seo.score : 0,
      } : { url: "Unknown", title: "Unknown", techStack: [], description: "", fonts: [], colors: [], stats: {}, seoScore: 0 };

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: "aiChat",
          apiKey: API_KEY,
          messages: chatHistory,
          siteContext,
        }, (resp) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (!resp || !resp.success) reject(new Error(resp?.error || "AI request failed"));
          else resolve(resp.reply);
        });
      });

      typingEl.remove();
      addChatMessage("bot", response);
      chatHistory.push({ role: "assistant", content: response });
    } catch (err) {
      typingEl.remove();
      addChatMessage("bot", "Error: " + err.message);
    }
  }

  function addChatMessage(role, text) {
    const container = $("#chat-messages");
    const msgEl = document.createElement("div");
    msgEl.className = "chat-msg " + role;

    const avatar = document.createElement("div");
    avatar.className = "chat-avatar";
    avatar.textContent = role === "bot" ? "AI" : "You";

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerHTML = formatChatText(text);

    msgEl.appendChild(avatar);
    msgEl.appendChild(bubble);
    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
    return msgEl;
  }

  function addTypingIndicator() {
    const container = $("#chat-messages");
    const msgEl = document.createElement("div");
    msgEl.className = "chat-msg bot";
    msgEl.innerHTML = '<div class="chat-avatar">AI</div><div class="chat-bubble"><div class="chat-typing"><span></span><span></span><span></span></div></div>';
    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
    return msgEl;
  }

  function formatChatText(text) {
    // Convert markdown-style code blocks
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, "<pre>$2</pre>");
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Convert **bold**
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Convert newlines
    text = text.replace(/\n/g, "<br>");
    return text;
  }

  /* ═══ SCREENSHOT ═══ */
  function setupScreenshotButton() {
    $("#screenshot-btn").addEventListener("click", captureScreenshot);
  }

  async function captureScreenshot() {
    const status = $("#screenshot-status");
    const btn = $("#screenshot-btn");
    btn.disabled = true;
    status.style.display = "block";
    status.className = "download-status progress";
    status.textContent = "Capturing...";

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "screenshot" }, (resp) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (!resp || !resp.success) reject(new Error(resp?.error || "Screenshot failed"));
          else resolve(resp);
        });
      });

      // Download the screenshot
      const a = document.createElement("a");
      a.href = response.dataUrl;
      const hostname = siteData ? new URL(siteData.url).hostname : "page";
      a.download = hostname + "_screenshot.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      status.className = "download-status success";
      status.textContent = "Screenshot saved!";
    } catch (err) {
      status.className = "download-status error";
      status.textContent = "Failed: " + err.message;
    }

    btn.disabled = false;
  }

  /* ═══ DOWNLOAD ZIP ═══ */
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

    try {
      const zip = new JSZip();
      const hostname = new URL(siteData.url).hostname.replace(/[^a-z0-9.-]/gi, "_");

      if ($("#dl-html").checked) {
        zip.file("index.html", siteData.html);
      }

      if ($("#dl-css").checked) {
        const cssFolder = zip.folder("css");
        let c = 0;
        for (const url of siteData.downloadResources.css) {
          try { const r = await fetchText(url); if (r) cssFolder.file(getFilename(url, "style_" + c + ".css"), r); c++; } catch (_) {}
        }
        siteData.downloadResources.inlineCSS.forEach((css, i) => { cssFolder.file("inline_" + i + ".css", css); });
      }

      if ($("#dl-js").checked) {
        const jsFolder = zip.folder("js");
        let c = 0;
        for (const url of siteData.downloadResources.js) {
          try { const r = await fetchText(url); if (r) jsFolder.file(getFilename(url, "script_" + c + ".js"), r); c++; } catch (_) {}
        }
        siteData.downloadResources.inlineJS.forEach((js, i) => { jsFolder.file("inline_" + i + ".js", js); });
      }

      if ($("#dl-images").checked) {
        const imgFolder = zip.folder("images");
        let c = 0;
        for (const url of siteData.downloadResources.images.slice(0, 50)) {
          try { const r = await fetchBlob(url); if (r) imgFolder.file(getFilename(url, "img_" + c + ".png"), r); c++; } catch (_) {}
        }
      }

      zip.file("README.md",
        "# Source: " + hostname + "\n\nDownloaded by Dd-info Chrome Extension\n\n" +
        "URL: " + siteData.url + "\n\n" +
        "## Tech Stack\n" + (siteData.techStack.length ? siteData.techStack.map((t) => "- " + t).join("\n") : "- None detected") + "\n"
      );

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
      status.textContent = "Download complete!";
    } catch (err) {
      status.className = "download-status error";
      status.textContent = "Failed: " + err.message;
    }
    btn.disabled = false;
  }

  /* ═══ COLLAPSIBLES ═══ */
  function setupCollapsibles() {
    $$(".toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.target);
        if (target) {
          const isOpen = target.style.display !== "none";
          target.style.display = isOpen ? "none" : "block";
          btn.classList.toggle("open", !isOpen);
        }
      });
    });
  }

  /* ═══ HELPERS ═══ */
  async function fetchText(url) { try { const r = await fetch(url, { mode: "cors" }); return r.ok ? await r.text() : null; } catch (_) { return null; } }
  async function fetchBlob(url) { try { const r = await fetch(url, { mode: "cors" }); return r.ok ? await r.blob() : null; } catch (_) { return null; } }

  function getFilename(url, fallback) {
    try { const p = new URL(url).pathname.split("/"); const n = p[p.length - 1]; return n && n.includes(".") ? n : fallback; }
    catch (_) { return fallback; }
  }

  function truncate(str, max) { if (!str || str === "\u2014") return str; return str.length > max ? str.slice(0, max) + "..." : str; }
  function escapeHtml(str) { const d = document.createElement("div"); d.textContent = str; return d.innerHTML; }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + units[i];
  }

  function showError(msg) {
    $("#loading").style.display = "none";
    $("#error").style.display = "block";
    $("#error-msg").textContent = msg;
  }
})();
