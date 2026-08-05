/**
 * Stable full-site prerender for machines where one long react-snap Chrome
 * session is killed. It restarts Chrome every 15 routes and writes each page
 * immediately, while always serving the original CRA shell as the SPA fallback.
 *
 * Run from the repository root after react-scripts build:
 *   node scripts/prerender-all-stable.js
 */
const fs = require("fs");
const http = require("http");
const path = require("path");
const url = require("url");
const puppeteer = require("../client/node_modules/puppeteer");

const BUILD_DIR = process.env.PRERENDER_BUILD_DIR
  ? path.resolve(process.env.PRERENDER_BUILD_DIR)
  : path.join(__dirname, "../client/build");
const CLIENT_PACKAGE = require("../client/package.json");
const ROUTES = process.env.PRERENDER_ROUTES
  ? process.env.PRERENDER_ROUTES.split(",").map((route) => route.trim()).filter(Boolean)
  : CLIENT_PACKAGE.reactSnap.include;
const ARTICLE_ROUTES = ROUTES.filter(
  (route) =>
    route.startsWith("/blog/") &&
    ![
      "/blog/love",
      "/blog/romance",
      "/blog/dating",
      "/blog/chat%20%26%20connection",
      "/blog/relationships",
      "/blog/mental%20health",
    ].includes(route)
);
const HYDRATION_CHECK_ROUTES = process.env.PRERENDER_HYDRATION_ROUTES
  ? process.env.PRERENDER_HYDRATION_ROUTES.split(",").map((route) => route.trim()).filter(Boolean)
  : ["/", "/blog", ARTICLE_ROUTES.at(-1), "/about"].filter(Boolean);
const PORT = Number(process.env.PRERENDER_PORT || 45999);
const ROUTES_PER_BROWSER = 10;
const CHROME_PATH =
  process.env.PRERENDER_CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const mimeTypes = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
};

function startServer(shellHtml) {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(url.parse(req.url).pathname);
    if (pathname === "/service-worker.js") {
      res.writeHead(404, { "Content-Type": "application/javascript" });
      res.end("");
      return;
    }
    const requestedPath = path.join(BUILD_DIR, pathname);
    const candidates = [requestedPath, path.join(requestedPath, "index.html")];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        res.writeHead(200, { "Content-Type": mimeTypes[path.extname(candidate)] || "application/octet-stream" });
        fs.createReadStream(candidate).pipe(res);
        return;
      }
    }

    // Never use a previously prerendered homepage as the fallback: doing so
    // hydrates the wrong route and causes React error #418.
    res.writeHead(200, { "Content-Type": mimeTypes[".html"] });
    res.end(shellHtml);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function launchBrowser() {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-gpu",
          "--disable-software-rasterizer",
          "--disable-background-networking",
          "--disable-extensions",
          "--no-first-run",
        ],
      });
    } catch (error) {
      lastError = error;
      await delay(attempt * 1000);
    }
  }
  throw lastError;
}

async function render(browser, route) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => {
    const requestUrl = request.url();
    if (requestUrl.startsWith(`http://127.0.0.1:${PORT}`)) {
      errors.push(`request: ${requestUrl} (${request.failure()?.errorText || "failed"})`);
    }
  });
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const requestUrl = request.url();
    if (requestUrl.startsWith(`http://127.0.0.1:${PORT}`) || requestUrl.startsWith("data:")) {
      request.continue();
    } else {
      request.abort();
    }
  });

  try {
    await page.goto(`http://127.0.0.1:${PORT}${route}`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    try {
      await page.waitForFunction(
        () => {
          const root = document.querySelector("#root");
          return root && root.textContent.trim().length > 100;
        },
        { timeout: 30000 }
      );
    } catch (error) {
      throw new Error(`${error.message}${errors.length ? `; ${errors.join("; ")}` : ""}`);
    }
    // Home's reveal observer adds `.in` after React mounts. Persisting that
    // effect-only class into the snapshot makes the next first render disagree
    // with the DOM it is hydrating. Restore React's declarative class list
    // before serialization; the observer will add `.in` again as sections
    // enter the viewport after hydration.
    await page.evaluate(() => {
      document.querySelectorAll(".lp-reveal.in").forEach((element) => {
        element.classList.remove("in");
      });
    });
    const html = (await page.content()).replace(/react-snap-onload/g, "onload");
    if (!/<h1[ >]/i.test(html) || /<div id="root"><\/div>/.test(html)) {
      throw new Error(`rendered output is incomplete${errors.length ? `; ${errors.join("; ")}` : ""}`);
    }
    return html;
  } finally {
    await page.close().catch(() => {});
  }
}

async function verifyHydration(browser, route) {
  const page = await browser.newPage();
  const hydrationErrors = [];

  page.on("console", (message) => {
    const text = message.text();
    if (
      message.type() === "error" &&
      /(?:hydration|hydrating|server rendered html|minified react error #418)/i.test(text)
    ) {
      hydrationErrors.push(`console: ${text}`);
    }
  });
  page.on("pageerror", (error) => {
    if (/(?:hydration|hydrating|minified react error #418)/i.test(error.message)) {
      hydrationErrors.push(`page: ${error.message}`);
    }
  });

  await page.evaluateOnNewDocument(() => {
    window.__chatrioLayoutShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__chatrioLayoutShifts.push(entry.value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const requestUrl = request.url();
    if (requestUrl.startsWith(`http://127.0.0.1:${PORT}`) || requestUrl.startsWith("data:")) {
      request.continue();
    } else {
      request.abort();
    }
  });

  try {
    await page.goto(`http://127.0.0.1:${PORT}${route}`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await delay(500);

    const result = await page.evaluate(() => {
      const rootEl = document.querySelector("#root");
      const rootText = rootEl && rootEl.textContent ? rootEl.textContent : "";
      return {
        cls: (window.__chatrioLayoutShifts || []).reduce((sum, value) => sum + value, 0),
        hasHeading: Boolean(document.querySelector("h1")),
        hasLoadingArticle: /Loading article/i.test(rootText),
        rootTextLength: rootText.trim().length,
      };
    });

    if (hydrationErrors.length) {
      throw new Error(`${route} hydration failed: ${hydrationErrors.join("; ")}`);
    }
    if (!result.hasHeading || result.rootTextLength < 100 || result.hasLoadingArticle) {
      throw new Error(`${route} incomplete hydrated content: ${JSON.stringify(result)}`);
    }
    if (result.cls > 0.05) {
      throw new Error(`${route} lab CLS ${result.cls.toFixed(3)} exceeds 0.05`);
    }
    console.log(`hydration ok (${route}, CLS ${result.cls.toFixed(3)})`);
  } finally {
    await page.close().catch(() => {});
  }
}

function outputFileForRoute(route) {
  if (route === "/") return path.join(BUILD_DIR, "index.html");
  return path.join(BUILD_DIR, route.replace(/^\//, ""), "index.html");
}

async function main() {
  const shellFile = path.join(BUILD_DIR, "index.html");
  if (!fs.existsSync(shellFile)) throw new Error("Build shell is missing. Run react-scripts build first.");
  const shellHtml = fs.readFileSync(shellFile, "utf8");
  if (!shellHtml.includes('<div id="root"></div>')) {
    throw new Error("Build index is already prerendered. Run react-scripts build again first.");
  }

  const server = await startServer(shellHtml);
  let browser;
  let homepageHtml;

  try {
    for (let index = 0; index < ROUTES.length; index += 1) {
      if (!browser || index % ROUTES_PER_BROWSER === 0) {
        if (browser) await browser.close();
        browser = await launchBrowser();
      }

      const route = ROUTES[index];
      let html;
      try {
        html = await render(browser, route);
      } catch (firstError) {
        await browser.close().catch(() => {});
        browser = await launchBrowser();
        html = await render(browser, route).catch((secondError) => {
          throw new Error(`${route} failed twice: ${firstError.message}; ${secondError.message}`);
        });
      }

      const outputFile = outputFileForRoute(route);
      fs.mkdirSync(path.dirname(outputFile), { recursive: true });
      fs.writeFileSync(outputFile, html);
      if (route === "/") homepageHtml = html;
      console.log(`crawled ${index + 1} out of ${ROUTES.length} (${route})`);
    }

    if (!homepageHtml) throw new Error("Homepage was not prerendered.");
    fs.writeFileSync(path.join(BUILD_DIR, "200.html"), homepageHtml);

    await browser.close();
    browser = await launchBrowser();
    for (const route of HYDRATION_CHECK_ROUTES) {
      await verifyHydration(browser, route);
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
