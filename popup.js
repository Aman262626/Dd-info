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
    renderSecurity(data.security, data.tracking);
    renderAccessibility(data.accessibility);
    renderPageStructure(data.pageStructure);
    renderCloneTab(data);
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
    if (stats.fonts !== undefined) $("#stat-fonts").textContent = stats.fonts;
    if (stats.svgs !== undefined) $("#stat-svgs").textContent = stats.svgs;
    if (stats.forms !== undefined) $("#stat-forms").textContent = stats.forms;
    if (stats.iframes !== undefined) $("#stat-iframes").textContent = stats.iframes;
    if (stats.tables !== undefined) $("#stat-tables").textContent = stats.tables;
    if (stats.buttons !== undefined) $("#stat-buttons").textContent = stats.buttons;
    if (stats.videos !== undefined) $("#stat-videos").textContent = stats.videos;
    if (stats.audios !== undefined) $("#stat-audios").textContent = stats.audios;
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

  /* ═══ SECURITY & TRACKING ═══ */
  function renderSecurity(security, tracking) {
    if (!security) return;

    // Security score
    const scoreEl = $("#sec-score-val");
    const circleEl = $("#sec-score-circle");
    const labelEl = $("#sec-score-label");
    scoreEl.textContent = security.score;
    if (security.score >= 80) { circleEl.classList.add("good"); labelEl.textContent = "Secure"; }
    else if (security.score >= 50) { circleEl.classList.add("ok"); labelEl.textContent = "Moderate"; }
    else { circleEl.classList.add("bad"); labelEl.textContent = "Vulnerable"; }

    // Security checks
    const checksContainer = $("#sec-checks");
    checksContainer.innerHTML = "";
    security.results.forEach((check) => {
      const cls = check.pass === true ? "pass" : (check.pass === "warn" ? "warn" : "fail");
      const icon = check.pass === true ? "\u2714" : (check.pass === "warn" ? "\u26a0" : "\u2718");
      const el = document.createElement("div");
      el.className = "seo-check " + cls;
      el.innerHTML = '<span class="check-icon">' + icon + '</span><span class="check-text">' + escapeHtml(check.text) + "</span>";
      checksContainer.appendChild(el);
    });

    // Tracking data
    if (tracking) {
      $("#cookie-count").textContent = tracking.cookieCount;
      $("#tracker-count").textContent = tracking.trackers.length;
      $("#storage-count").textContent = tracking.localStorageCount + tracking.sessionStorageCount;

      const trackerList = $("#tracker-list");
      trackerList.innerHTML = "";
      if (tracking.trackers.length > 0) {
        tracking.trackers.forEach((t) => {
          const tag = document.createElement("span");
          tag.className = "tag tech";
          tag.textContent = t;
          trackerList.appendChild(tag);
        });
      } else {
        trackerList.innerHTML = '<span class="tag empty">No trackers detected</span>';
      }

      const cookieList = $("#cookie-list");
      cookieList.innerHTML = "";
      if (tracking.cookies.length > 0) {
        tracking.cookies.slice(0, 10).forEach((c) => {
          const item = document.createElement("div");
          item.className = "meta-item";
          item.innerHTML = '<span class="meta-name">' + escapeHtml(c.name) + "</span><span class=\"meta-value\">" + escapeHtml(truncate(c.value, 40)) + "</span>";
          cookieList.appendChild(item);
        });
      }
    }
  }

  /* ═══ ACCESSIBILITY ═══ */
  function renderAccessibility(a11y) {
    if (!a11y) return;

    const scoreEl = $("#a11y-score-val");
    const circleEl = $("#a11y-score-circle");
    const labelEl = $("#a11y-score-label");
    scoreEl.textContent = a11y.score;
    if (a11y.score >= 80) { circleEl.classList.add("good"); labelEl.textContent = "Good"; }
    else if (a11y.score >= 50) { circleEl.classList.add("ok"); labelEl.textContent = "Needs Work"; }
    else { circleEl.classList.add("bad"); labelEl.textContent = "Poor"; }

    const checksContainer = $("#a11y-checks");
    checksContainer.innerHTML = "";
    a11y.issues.forEach((issue) => {
      const cls = issue.severity === "pass" ? "pass" : (issue.severity === "warn" ? "warn" : "fail");
      const icon = issue.severity === "pass" ? "\u2714" : (issue.severity === "warn" ? "\u26a0" : "\u2718");
      const el = document.createElement("div");
      el.className = "seo-check " + cls;
      el.innerHTML = '<span class="check-icon">' + icon + '</span><span class="check-text">' + escapeHtml(issue.text) + "</span>";
      checksContainer.appendChild(el);
    });
  }

  /* ═══ PAGE STRUCTURE ═══ */
  function renderPageStructure(ps) {
    if (!ps) return;

    // Links
    $("#link-internal").textContent = ps.links.internal;
    $("#link-external").textContent = ps.links.external;
    $("#link-total").textContent = ps.links.total;

    const domainsContainer = $("#external-domains");
    domainsContainer.innerHTML = "";
    if (ps.externalDomains.length > 0) {
      ps.externalDomains.forEach((d) => {
        const tag = document.createElement("span");
        tag.className = "tag font";
        tag.textContent = d;
        domainsContainer.appendChild(tag);
      });
    }

    // Structure stats
    $("#struct-elements").textContent = ps.structure.domElements;
    $("#struct-iframes").textContent = ps.structure.iframes;
    $("#struct-forms").textContent = ps.structure.forms;

    // Headings
    const headingsList = $("#headings-list");
    headingsList.innerHTML = "";
    if (ps.headings.length > 0) {
      ps.headings.forEach((h) => {
        const item = document.createElement("div");
        item.className = "meta-item";
        const indent = (parseInt(h.tag[1]) - 1) * 12;
        item.innerHTML = '<span class="meta-name" style="min-width:30px;padding-left:' + indent + 'px">' + h.tag + '</span><span class="meta-value">' + escapeHtml(truncate(h.text, 50)) + "</span>";
        headingsList.appendChild(item);
      });
    } else {
      headingsList.innerHTML = '<div class="meta-item"><span class="meta-value">No headings found</span></div>';
    }
  }

  /* ═══ CLONE TAB ═══ */
  function renderCloneTab(data) {
    // Typography
    if (data.typography) {
      const typoList = $("#typography-list");
      typoList.innerHTML = "";
      const entries = Object.entries(data.typography);
      if (entries.length > 0) {
        entries.forEach(([sel, t]) => {
          const item = document.createElement("div");
          item.className = "meta-item";
          item.innerHTML = '<span class="meta-name" style="min-width:60px">' + escapeHtml(sel) + '</span><span class="meta-value">' + t.fontSize + " / " + t.fontWeight + " / " + truncate(t.fontFamily, 30) + "</span>";
          typoList.appendChild(item);
        });
      } else {
        typoList.innerHTML = '<p class="muted">No typography data</p>';
      }
    }

    // Navigation
    if (data.navigation) {
      const navList = $("#navigation-list");
      navList.innerHTML = "";
      if (data.navigation.length > 0) {
        data.navigation.forEach((nav) => {
          const header = document.createElement("div");
          header.className = "meta-item";
          header.innerHTML = '<span class="meta-name" style="color:#a78bfa;font-weight:600">' + escapeHtml(nav.id) + '</span><span class="meta-value">' + nav.links.length + " links</span>";
          navList.appendChild(header);
          nav.links.slice(0, 10).forEach((link) => {
            const item = document.createElement("div");
            item.className = "meta-item";
            item.innerHTML = '<span class="meta-name" style="padding-left:12px">' + escapeHtml(truncate(link.text, 25)) + '</span><span class="meta-value url">' + escapeHtml(truncate(link.href, 40)) + "</span>";
            navList.appendChild(item);
          });
        });
      } else {
        navList.innerHTML = '<p class="muted">No navigation menus found</p>';
      }
    }

    // Social Links
    if (data.socialLinks) {
      const socialList = $("#social-links-list");
      socialList.innerHTML = "";
      if (data.socialLinks.length > 0) {
        data.socialLinks.forEach((s) => {
          const tag = document.createElement("span");
          tag.className = "tag tech";
          tag.textContent = s.name;
          tag.title = s.url;
          socialList.appendChild(tag);
        });
      } else {
        socialList.innerHTML = '<span class="tag empty">No social links found</span>';
      }
    }

    // Image Inventory
    if (data.imageInventory) {
      const imgs = data.imageInventory;
      $("#img-total").textContent = imgs.length;
      $("#img-with-alt").textContent = imgs.filter((i) => i.alt).length;
      $("#img-lazy").textContent = imgs.filter((i) => i.isLazy).length;
    }

    // Shadows
    if (data.shadows) {
      const shadowsList = $("#shadows-list");
      shadowsList.innerHTML = "";
      const allShadows = [...data.shadows.boxShadows.map((s) => ({ type: "box", ...s })), ...data.shadows.textShadows.map((s) => ({ type: "text", ...s }))];
      if (allShadows.length > 0) {
        allShadows.forEach((s) => {
          const item = document.createElement("div");
          item.className = "meta-item";
          item.innerHTML = '<span class="meta-name">' + s.type + "-shadow</span>" + '<span class="meta-value">' + escapeHtml(truncate(s.value, 60)) + "</span>";
          shadowsList.appendChild(item);
        });
      } else {
        shadowsList.innerHTML = '<p class="muted">No shadows found</p>';
      }
    }

    // Z-Index
    if (data.zIndexMap) {
      const zList = $("#zindex-list");
      zList.innerHTML = "";
      if (data.zIndexMap.length > 0) {
        data.zIndexMap.forEach((z) => {
          const item = document.createElement("div");
          item.className = "meta-item";
          item.innerHTML = '<span class="meta-name" style="color:#fbbf24;min-width:50px">z:' + z.zIndex + '</span><span class="meta-value">' + escapeHtml(z.selector) + " (" + z.position + ")</span>";
          zList.appendChild(item);
        });
      } else {
        zList.innerHTML = '<p class="muted">No z-index elements found</p>';
      }
    }

    // Data Attributes
    if (data.dataAttributes) {
      const daList = $("#data-attrs-list");
      daList.innerHTML = "";
      const entries = Object.entries(data.dataAttributes);
      if (entries.length > 0) {
        entries.forEach(([key, val]) => {
          const item = document.createElement("div");
          item.className = "meta-item";
          item.innerHTML = '<span class="meta-name">data-' + escapeHtml(key) + '</span><span class="meta-value">' + val.count + "x" + (val.examples[0] ? " — " + escapeHtml(truncate(val.examples[0], 30)) : "") + "</span>";
          daList.appendChild(item);
        });
      } else {
        daList.innerHTML = '<p class="muted">No data attributes found</p>';
      }
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
    // Select/Deselect all buttons
    const selectAllBtn = $("#select-all-btn");
    const deselectAllBtn = $("#deselect-all-btn");
    if (selectAllBtn) {
      selectAllBtn.addEventListener("click", () => {
        $$(".download-options input[type='checkbox']").forEach((cb) => { cb.checked = true; });
      });
    }
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener("click", () => {
        $$(".download-options input[type='checkbox']").forEach((cb) => { cb.checked = false; });
      });
    }
  }

  function updateProgress(pct, text) {
    const bar = $("#download-progress");
    const fill = $("#download-progress-fill");
    const status = $("#download-status");
    if (bar) { bar.style.display = "block"; fill.style.width = pct + "%"; }
    if (status) { status.style.display = "block"; status.className = "download-status progress"; status.textContent = text; }
  }

  async function downloadSource() {
    if (!siteData) return;
    const btn = $("#download-btn");
    const status = $("#download-status");
    btn.disabled = true;
    status.style.display = "block";
    status.className = "download-status progress";
    status.textContent = "Preparing complete clone...";

    try {
      const zip = new JSZip();
      const hostname = new URL(siteData.url).hostname.replace(/[^a-z0-9.-]/gi, "_");
      let step = 0;
      const totalSteps = 15;

      // 1. HTML
      if ($("#dl-html").checked) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Saving HTML...");
        zip.file("index.html", siteData.html);
      }

      // 2. CSS
      if ($("#dl-css").checked) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Downloading CSS files...");
        const cssFolder = zip.folder("css");
        let c = 0;
        for (const url of siteData.downloadResources.css) {
          try { const r = await fetchText(url); if (r) cssFolder.file(getFilename(url, "style_" + c + ".css"), r); c++; } catch (_) {}
        }
        siteData.downloadResources.inlineCSS.forEach((css, i) => { cssFolder.file("inline_" + i + ".css", css); });
      }

      // 3. JS
      if ($("#dl-js").checked) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Downloading JS files...");
        const jsFolder = zip.folder("js");
        let c = 0;
        for (const url of siteData.downloadResources.js) {
          try { const r = await fetchText(url); if (r) jsFolder.file(getFilename(url, "script_" + c + ".js"), r); c++; } catch (_) {}
        }
        siteData.downloadResources.inlineJS.forEach((js, i) => { jsFolder.file("inline_" + i + ".js", js); });
      }

      // 4. Images
      if ($("#dl-images").checked) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Downloading images...");
        const imgFolder = zip.folder("images");
        let c = 0;
        for (const url of siteData.downloadResources.images.slice(0, 50)) {
          try { const r = await fetchBlob(url); if (r) imgFolder.file(getFilename(url, "img_" + c + ".png"), r); c++; } catch (_) {}
        }
      }

      // 5. Font Files
      if ($("#dl-fonts").checked && siteData.fontFiles && siteData.fontFiles.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Downloading font files...");
        const fontFolder = zip.folder("fonts");
        let c = 0;
        for (const url of siteData.fontFiles) {
          try { const r = await fetchBlob(url); if (r) fontFolder.file(getFilename(url, "font_" + c + ".woff2"), r); c++; } catch (_) {}
        }
      }

      // 6. SVGs
      if ($("#dl-svgs").checked && siteData.inlineSVGs && siteData.inlineSVGs.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Extracting SVG icons...");
        const svgFolder = zip.folder("svgs");
        siteData.inlineSVGs.forEach((svg) => {
          svgFolder.file(svg.id + ".svg", svg.content);
        });
      }

      // 7. Favicons
      if ($("#dl-favicons").checked && siteData.faviconsAndManifest) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Downloading favicons...");
        const faviconFolder = zip.folder("favicons");
        for (const fav of siteData.faviconsAndManifest.favicons) {
          try { const r = await fetchBlob(fav.href); if (r) faviconFolder.file(getFilename(fav.href, "favicon.ico"), r); } catch (_) {}
        }
        if (siteData.faviconsAndManifest.manifestUrl) {
          try { const r = await fetchText(siteData.faviconsAndManifest.manifestUrl); if (r) faviconFolder.file("manifest.json", r); } catch (_) {}
        }
      }

      // 8. Background Images
      if ($("#dl-bgimages").checked && siteData.backgrounds && siteData.backgrounds.imageUrls.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Downloading background images...");
        const bgFolder = zip.folder("bg-images");
        let c = 0;
        for (const url of siteData.backgrounds.imageUrls.slice(0, 30)) {
          try { const r = await fetchBlob(url); if (r) bgFolder.file(getFilename(url, "bg_" + c + ".png"), r); c++; } catch (_) {}
        }
      }

      // 9. CSS Variables
      if ($("#dl-variables").checked && siteData.cssVariables) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Generating CSS variables...");
        const varsObj = siteData.cssVariables;
        if (Object.keys(varsObj).length > 0) {
          let cssVarsContent = "/* CSS Custom Properties extracted by Dd-info */\n:root {\n";
          Object.entries(varsObj).forEach(([prop, val]) => {
            cssVarsContent += "  " + prop + ": " + val + ";\n";
          });
          cssVarsContent += "}\n";
          zip.file("css/variables.css", cssVarsContent);
        }
      }

      // 10. Animations & Keyframes
      if ($("#dl-animations").checked && siteData.animations) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Extracting animations...");
        let animContent = "/* CSS Animations & Keyframes extracted by Dd-info */\n\n";
        if (siteData.animations.keyframes.length > 0) {
          animContent += siteData.animations.keyframes.join("\n\n") + "\n\n";
        }
        if (siteData.animations.transitions.length > 0) {
          animContent += "/* Animated Elements */\n";
          siteData.animations.transitions.forEach((t) => {
            animContent += "/* " + t.selector + " */\n";
            animContent += "/* animation: " + t.animation + " " + t.duration + " " + t.timingFunction + " */\n";
            if (t.transition) animContent += "/* transition: " + t.transition + " */\n";
            animContent += "\n";
          });
        }
        if (animContent.length > 60) zip.file("css/animations.css", animContent);
      }

      // 11. Buttons & Interactive Elements
      if ($("#dl-buttons").checked && siteData.interactiveElements) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Documenting buttons & inputs...");
        let btnCSS = "/* Button & Interactive Element Styles extracted by Dd-info */\n\n";
        siteData.interactiveElements.forEach((el, i) => {
          btnCSS += "/* Button " + (i + 1) + ': "' + el.text.substring(0, 30) + '" */\n';
          const sel = el.classes ? "." + el.classes.trim().split(/\s+/).slice(0, 2).join(".") : el.tag + "[type='" + el.type + "']";
          btnCSS += sel + " {\n";
          Object.entries(el.styles).forEach(([k, v]) => {
            if (v && v !== "none" && v !== "normal" && v !== "0px") {
              btnCSS += "  " + k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()) + ": " + v + ";\n";
            }
          });
          btnCSS += "}\n\n";
        });
        zip.file("css/buttons.css", btnCSS);
      }

      // 12. Form Elements
      if ($("#dl-forms").checked && siteData.formElements && siteData.formElements.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Documenting form structures...");
        let formHTML = "<!-- Form Elements extracted by Dd-info -->\n\n";
        siteData.formElements.forEach((form) => {
          formHTML += '<form id="' + form.id + '" action="' + form.action + '" method="' + form.method + '">\n';
          form.fields.forEach((field) => {
            if (field.tag === "select") {
              formHTML += '  <select name="' + field.name + '"' + (field.required ? " required" : "") + ">\n";
              if (field.options) field.options.forEach((o) => { formHTML += '    <option value="' + o.value + '">' + o.text + "</option>\n"; });
              formHTML += "  </select>\n";
            } else if (field.tag === "textarea") {
              formHTML += '  <textarea name="' + field.name + '" placeholder="' + field.placeholder + '"' + (field.required ? " required" : "") + "></textarea>\n";
            } else {
              formHTML += '  <input type="' + field.type + '" name="' + field.name + '"';
              if (field.placeholder) formHTML += ' placeholder="' + field.placeholder + '"';
              if (field.value) formHTML += ' value="' + field.value + '"';
              if (field.required) formHTML += " required";
              formHTML += ">\n";
            }
          });
          formHTML += "</form>\n\n";
        });
        zip.file("forms/forms.html", formHTML);
        zip.file("forms/forms.json", JSON.stringify(siteData.formElements, null, 2));
      }

      // 13. Layout Map
      if ($("#dl-layout").checked && siteData.layoutMap) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Generating layout map...");
        zip.file("structure/layout-map.json", JSON.stringify(siteData.layoutMap, null, 2));
        if (siteData.iframeSources && siteData.iframeSources.length > 0) {
          zip.file("structure/iframes.json", JSON.stringify(siteData.iframeSources, null, 2));
        }
        if (siteData.mediaSources) {
          const ms = siteData.mediaSources;
          if (ms.videos.length > 0 || ms.audios.length > 0) {
            zip.file("structure/media-sources.json", JSON.stringify(ms, null, 2));
          }
        }
      }

      // 14. Computed Styles
      if ($("#dl-styles").checked && siteData.computedStyles) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Extracting computed styles...");
        let stylesCSS = "/* Computed Styles for Key Elements extracted by Dd-info */\n\n";
        siteData.computedStyles.forEach((elem) => {
          stylesCSS += "/* " + elem.tag + " — " + elem.selector + " */\n";
          stylesCSS += elem.selector + " {\n";
          Object.entries(elem.styles).forEach(([k, v]) => {
            if (v && v !== "none" && v !== "normal" && v !== "auto" && v !== "0px" && v !== "visible" && v !== "static") {
              stylesCSS += "  " + k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()) + ": " + v + ";\n";
            }
          });
          stylesCSS += "}\n\n";
        });
        zip.file("css/computed-styles.css", stylesCSS);
      }

      // 15. Media Queries
      if ($("#dl-media").checked && siteData.mediaQueries && siteData.mediaQueries.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Extracting media queries...");
        let mqCSS = "/* Media Queries (Breakpoints) extracted by Dd-info */\n\n";
        siteData.mediaQueries.forEach((mq) => {
          mqCSS += "@media " + mq + " {\n  /* styles */\n}\n\n";
        });
        zip.file("css/media-queries.css", mqCSS);
      }

      // Background gradients
      if (siteData.backgrounds && siteData.backgrounds.gradients.length > 0) {
        let gradCSS = "/* CSS Gradients extracted by Dd-info */\n\n";
        siteData.backgrounds.gradients.forEach((g) => {
          gradCSS += "/* " + g.selector + " */\n";
          gradCSS += g.selector + " {\n  background-image: " + g.gradient + ";\n}\n\n";
        });
        zip.file("css/gradients.css", gradCSS);
      }

      // 16. Typography Map
      if ($("#dl-typography").checked && siteData.typography) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Extracting typography...");
        let typoCSS = "/* Typography Map extracted by Dd-info */\n\n";
        Object.entries(siteData.typography).forEach(([sel, t]) => {
          typoCSS += sel + " {\n";
          Object.entries(t).forEach(([k, v]) => {
            if (v && v !== "normal" && v !== "none" && v !== "0px") {
              typoCSS += "  " + k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()) + ": " + v + ";\n";
            }
          });
          typoCSS += "}\n\n";
        });
        zip.file("css/typography.css", typoCSS);
      }

      // 17. Shadows
      if ($("#dl-shadows").checked && siteData.shadows) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Extracting shadows...");
        let shadowCSS = "/* Shadows extracted by Dd-info */\n\n";
        siteData.shadows.boxShadows.forEach((s) => {
          shadowCSS += s.selector + " {\n  box-shadow: " + s.value + ";\n}\n\n";
        });
        siteData.shadows.textShadows.forEach((s) => {
          shadowCSS += s.selector + " {\n  text-shadow: " + s.value + ";\n}\n\n";
        });
        if (shadowCSS.length > 50) zip.file("css/shadows.css", shadowCSS);
      }

      // 18. Borders
      if ($("#dl-borders").checked && siteData.borders && siteData.borders.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Extracting borders...");
        let borderCSS = "/* Border Styles extracted by Dd-info */\n\n";
        siteData.borders.forEach((b) => {
          borderCSS += b.selector + " {\n";
          borderCSS += "  border: " + b.border + ";\n";
          if (b.borderRadius && b.borderRadius !== "0px") borderCSS += "  border-radius: " + b.borderRadius + ";\n";
          borderCSS += "}\n\n";
        });
        zip.file("css/borders.css", borderCSS);
      }

      // 19. Navigation
      if ($("#dl-navigation").checked && siteData.navigation && siteData.navigation.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Extracting navigation...");
        let navHTML = "<!-- Navigation Structure extracted by Dd-info -->\n\n";
        siteData.navigation.forEach((nav) => {
          navHTML += '<nav id="' + nav.id + '" style="display:' + nav.display + ";background:" + nav.backgroundColor + '">\n';
          navHTML += "  <ul>\n";
          nav.links.forEach((link) => {
            navHTML += '    <li><a href="' + link.href + '">' + escapeHtml(link.text) + "</a></li>\n";
          });
          navHTML += "  </ul>\n</nav>\n\n";
        });
        zip.file("structure/navigation.html", navHTML);
        zip.file("structure/navigation.json", JSON.stringify(siteData.navigation, null, 2));
      }

      // 20. Tables
      if ($("#dl-tables").checked && siteData.tableData && siteData.tableData.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Extracting tables...");
        siteData.tableData.forEach((table, ti) => {
          let csv = "";
          if (table.headers.length > 0) csv += table.headers.join(",") + "\n";
          table.rows.forEach((row) => { csv += row.map((c) => '"' + c.replace(/"/g, '""') + '"').join(",") + "\n"; });
          zip.file("tables/" + table.id + ".csv", csv);
        });
        zip.file("tables/tables.json", JSON.stringify(siteData.tableData, null, 2));
      }

      // 21. Image Map
      if ($("#dl-imgmap").checked && siteData.imageInventory && siteData.imageInventory.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Generating image map...");
        zip.file("structure/image-inventory.json", JSON.stringify(siteData.imageInventory, null, 2));
      }

      // 22. Z-Index Map
      if ($("#dl-zindex").checked && siteData.zIndexMap && siteData.zIndexMap.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Mapping z-index stack...");
        zip.file("structure/z-index-map.json", JSON.stringify(siteData.zIndexMap, null, 2));
      }

      // 23. Data Attributes
      if ($("#dl-data-attrs").checked && siteData.dataAttributes) {
        const daKeys = Object.keys(siteData.dataAttributes);
        if (daKeys.length > 0) {
          updateProgress(Math.round((++step / totalSteps) * 100), "Extracting data attributes...");
          zip.file("structure/data-attributes.json", JSON.stringify(siteData.dataAttributes, null, 2));
        }
      }

      // 24. Social Links
      if ($("#dl-social").checked && siteData.socialLinks && siteData.socialLinks.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Extracting social links...");
        let socialHTML = "<!-- Social Media Links extracted by Dd-info -->\n<ul>\n";
        siteData.socialLinks.forEach((s) => {
          socialHTML += '  <li><a href="' + s.url + '" target="_blank">' + escapeHtml(s.name) + (s.text ? " — " + escapeHtml(s.text) : "") + "</a></li>\n";
        });
        socialHTML += "</ul>\n";
        zip.file("structure/social-links.html", socialHTML);
        zip.file("structure/social-links.json", JSON.stringify(siteData.socialLinks, null, 2));
      }

      // 25. Text Content
      if ($("#dl-text").checked && siteData.textContent && siteData.textContent.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Extracting text content...");
        let textMD = "# Page Text Content\n\n";
        siteData.textContent.forEach((sec) => {
          textMD += "## " + sec.tag.toUpperCase() + (sec.id ? " #" + sec.id : "") + (sec.classes ? " ." + sec.classes : "") + "\n\n";
          textMD += sec.text + "\n\n---\n\n";
        });
        zip.file("content/text-content.md", textMD);
      }

      // 26. Schema / Structured Data
      if ($("#dl-schema").checked && siteData.structuredData && siteData.structuredData.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Extracting structured data...");
        siteData.structuredData.forEach((sd, i) => {
          zip.file("structure/schema-" + i + ".json", JSON.stringify(sd, null, 2));
        });
      }

      // 27. Scroll Behaviors
      if ($("#dl-scroll").checked && siteData.scrollBehaviors && siteData.scrollBehaviors.length > 0) {
        updateProgress(Math.round((++step / totalSteps) * 100), "Extracting scroll behaviors...");
        zip.file("structure/scroll-behaviors.json", JSON.stringify(siteData.scrollBehaviors, null, 2));
      }

      // Enhanced README
      updateProgress(95, "Generating README...");
      let readmeContent = "# Source Clone: " + hostname + "\n\n";
      readmeContent += "Downloaded by Dd-info Chrome Extension — Complete Website Clone\n\n";
      readmeContent += "URL: " + siteData.url + "\n\n";
      readmeContent += "## Tech Stack\n" + (siteData.techStack.length ? siteData.techStack.map((t) => "- " + t).join("\n") : "- None detected") + "\n\n";
      readmeContent += "## Fonts Used\n" + (siteData.fonts.length ? siteData.fonts.map((f) => "- " + f).join("\n") : "- Default fonts") + "\n\n";
      readmeContent += "## Color Palette\n" + (siteData.colors.length ? siteData.colors.map((c) => "- `" + c + "`").join("\n") : "- None detected") + "\n\n";
      readmeContent += "## Files Included\n";
      readmeContent += "- `index.html` — Full page HTML\n";
      readmeContent += "- `css/` — External + inline CSS files\n";
      readmeContent += "- `css/variables.css` — CSS custom properties (:root variables)\n";
      readmeContent += "- `css/animations.css` — Keyframe animations & transitions\n";
      readmeContent += "- `css/buttons.css` — Button & interactive element styles\n";
      readmeContent += "- `css/computed-styles.css` — Computed styles for key elements\n";
      readmeContent += "- `css/media-queries.css` — Responsive breakpoints\n";
      readmeContent += "- `css/gradients.css` — CSS gradients used on the page\n";
      readmeContent += "- `css/typography.css` — Typography map (font sizes, weights, families)\n";
      readmeContent += "- `css/shadows.css` — Box shadows & text shadows\n";
      readmeContent += "- `css/borders.css` — Border styles & border-radius\n";
      readmeContent += "- `js/` — External + inline JavaScript files\n";
      readmeContent += "- `images/` — Page images\n";
      readmeContent += "- `fonts/` — Font files (woff2, woff, ttf, etc.)\n";
      readmeContent += "- `svgs/` — Inline SVG icons\n";
      readmeContent += "- `favicons/` — Favicons and web manifest\n";
      readmeContent += "- `bg-images/` — Background images\n";
      readmeContent += "- `forms/` — Form structures (HTML + JSON)\n";
      readmeContent += "- `tables/` — Table data (CSV + JSON)\n";
      readmeContent += "- `content/` — Page text content\n";
      readmeContent += "- `structure/` — Layout map, navigation, z-index, social links, images, iframes, media, data attrs, scroll behaviors, schema\n\n";
      readmeContent += "## Page Stats\n";
      readmeContent += "- CSS Files: " + siteData.stats.cssFiles + "\n";
      readmeContent += "- JS Files: " + siteData.stats.jsFiles + "\n";
      readmeContent += "- Images: " + siteData.stats.images + "\n";
      readmeContent += "- Fonts: " + (siteData.stats.fonts || 0) + "\n";
      readmeContent += "- SVGs: " + (siteData.stats.svgs || 0) + "\n";
      readmeContent += "- Forms: " + (siteData.stats.forms || 0) + "\n";
      readmeContent += "- Links: " + siteData.stats.links + "\n";

      if (siteData.cssVariables && Object.keys(siteData.cssVariables).length > 0) {
        readmeContent += "\n## CSS Variables\n";
        Object.entries(siteData.cssVariables).forEach(([prop, val]) => {
          readmeContent += "- `" + prop + "`: `" + val + "`\n";
        });
      }

      if (siteData.mediaQueries && siteData.mediaQueries.length > 0) {
        readmeContent += "\n## Responsive Breakpoints\n";
        siteData.mediaQueries.forEach((mq) => {
          readmeContent += "- `" + mq + "`\n";
        });
      }

      if (siteData.socialLinks && siteData.socialLinks.length > 0) {
        readmeContent += "\n## Social Links\n";
        siteData.socialLinks.forEach((s) => {
          readmeContent += "- [" + s.name + "](" + s.url + ")\n";
        });
      }

      readmeContent += "\n## Stats\n";
      readmeContent += "- Tables: " + (siteData.stats.tables || 0) + "\n";
      readmeContent += "- Buttons: " + (siteData.stats.buttons || 0) + "\n";
      readmeContent += "- Videos: " + (siteData.stats.videos || 0) + "\n";
      readmeContent += "- Audios: " + (siteData.stats.audios || 0) + "\n";
      readmeContent += "- Iframes: " + (siteData.stats.iframes || 0) + "\n";

      zip.file("README.md", readmeContent);

      updateProgress(100, "Generating ZIP...");
      const blob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = hostname + "_complete_clone.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      status.className = "download-status success";
      status.textContent = "Complete clone downloaded!";
      const progressBar = $("#download-progress");
      if (progressBar) progressBar.style.display = "none";
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
