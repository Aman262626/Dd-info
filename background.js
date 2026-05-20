/* Dd-info Background Service Worker */

const SAMBANOVA_API_URL = "https://api.sambanova.ai/v1/chat/completions";
const SAMBANOVA_MODEL = "Meta-Llama-3.1-8B-Instruct";

chrome.runtime.onInstalled.addListener(() => {
  console.log("Dd-info v2.0 extension installed successfully.");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "screenshot") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
    return true;
  }

  if (request.action === "aiChat") {
    handleAIChat(request.apiKey, request.messages, request.siteContext)
      .then((reply) => sendResponse({ success: true, reply }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "fetchHeaders") {
    fetchResponseHeaders(request.url)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "checkRobotsSitemap") {
    checkRobotsSitemap(request.origin)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleAIChat(apiKey, messages, siteContext) {
  const systemPrompt = `You are Dd-info AI Assistant, built into a Chrome extension that analyzes websites. You help users understand websites, their tech stack, design, and how to build similar ones.

Current website context:
- URL: ${siteContext.url}
- Title: ${siteContext.title}
- Tech Stack: ${siteContext.techStack.join(", ") || "Not detected"}
- Description: ${siteContext.description}
- Fonts: ${siteContext.fonts.join(", ") || "Default fonts"}
- Colors: ${siteContext.colors.join(", ") || "Not detected"}
- CSS Files: ${siteContext.stats.cssFiles}, JS Files: ${siteContext.stats.jsFiles}, Images: ${siteContext.stats.images}
- SEO Score: ${siteContext.seoScore}/100

Instructions:
- Answer in the same language the user types in (Hindi, English, Hinglish, etc.)
- Be helpful, concise, and practical
- When asked how to build similar sites, give step-by-step guidance with actual code snippets
- When asked about tech stack, explain what each technology does
- You can suggest improvements for SEO, performance, and design
- Format code with markdown code blocks`;

  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const response = await fetch(SAMBANOVA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: SAMBANOVA_MODEL,
      messages: apiMessages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error("API error (" + response.status + "): " + errText);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function fetchResponseHeaders(url) {
  try {
    const response = await fetch(url, { method: "HEAD", mode: "cors" });
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return { status: response.status, statusText: response.statusText, headers };
  } catch (err) {
    try {
      const response = await fetch(url, { method: "GET", mode: "cors" });
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      return { status: response.status, statusText: response.statusText, headers };
    } catch (_) {
      return { status: 0, statusText: "Could not fetch headers", headers: {} };
    }
  }
}

async function checkRobotsSitemap(origin) {
  const results = { robots: null, sitemap: null };

  try {
    const robotsResp = await fetch(origin + "/robots.txt", { mode: "cors" });
    if (robotsResp.ok) {
      const text = await robotsResp.text();
      results.robots = { exists: true, content: text.substring(0, 2000), status: robotsResp.status };
    } else {
      results.robots = { exists: false, status: robotsResp.status };
    }
  } catch (_) {
    results.robots = { exists: false, status: 0, error: "Could not fetch" };
  }

  try {
    const sitemapResp = await fetch(origin + "/sitemap.xml", { mode: "cors" });
    if (sitemapResp.ok) {
      const text = await sitemapResp.text();
      const urlCount = (text.match(/<url>/g) || []).length;
      results.sitemap = { exists: true, urlCount, status: sitemapResp.status, preview: text.substring(0, 500) };
    } else {
      results.sitemap = { exists: false, status: sitemapResp.status };
    }
  } catch (_) {
    results.sitemap = { exists: false, status: 0, error: "Could not fetch" };
  }

  return results;
}
