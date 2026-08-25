/**
 * Renders docs/relay-case-study.md into a styled, print-ready HTML file and
 * then a PDF, so the Markdown stays the single source of truth.
 *
 * Usage: npm run docs:pdf
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { marked } from "marked";

const run = promisify(execFile);
const ROOT = process.cwd();
// One source of truth per language; both render through the same stylesheet.
const EDITIONS = [
  { md: "relay-case-study.md", html: "relay-case-study.html", pdf: "Relay-Case-Study-EN.pdf", lang: "en" },
  { md: "relay-case-study.es.md", html: "relay-case-study.es.html", pdf: "Relay-Case-Study-ES.pdf", lang: "es" },
  { md: "mcp-exposure.md", html: "mcp-exposure.html", pdf: "Relay-MCP-EN.pdf", lang: "en" },
  { md: "mcp-exposure.es.md", html: "mcp-exposure.es.html", pdf: "Relay-MCP-ES.pdf", lang: "es" },
  // Internal — lives under private/, never published.
  { md: "../private/docs/jorge-onboarding.md", html: "../private/docs/jorge-onboarding.html", pdf: "../private/docs/Relay-Jorge-Guide-EN.pdf", lang: "en" },
  { md: "../private/docs/jorge-onboarding.es.md", html: "../private/docs/jorge-onboarding.es.html", pdf: "../private/docs/Relay-Guia-Jorge-ES.pdf", lang: "es" },
];

// Optional substring filter, so rebuilding one document does not churn the rest:
//   npm run docs:pdf -- jorge
const FILTER = process.argv[2] ?? "";

// Any Chromium-family browser can print the HTML. Take the first one present.
const CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --ink: #090a0c;
  --muted: #5f666f;
  --accent: #315487;
  --accent-bright: #5276b5;
  --accent-soft: #dbe4ff;
  --signal: #138b4e;
  --write: #b23c26;
  --write-soft: #fbe6e1;
  --border: #d6dadd;
  --surface: #f3f5f6;
}

* { box-sizing: border-box; }

body {
  font-family: 'Onest', -apple-system, system-ui, sans-serif;
  color: var(--ink);
  line-height: 1.6;
  font-size: 10.5pt;
  margin: 0;
  padding: 0;
}

.page { max-width: 46rem; margin: 0 auto; padding: 0 8mm; }

h1 {
  font-size: 30pt;
  line-height: 1.05;
  letter-spacing: -0.035em;
  font-weight: 700;
  margin: 0 0 .4rem;
}
h1 + p strong { font-size: 12.5pt; font-weight: 600; line-height: 1.35; display: block; }

h2 {
  font-size: 15pt;
  letter-spacing: -0.02em;
  font-weight: 600;
  margin: 2.1rem 0 .7rem;
  padding-top: .7rem;
  border-top: 1px solid var(--border);
  page-break-after: avoid;
}
h3 { font-size: 11.5pt; font-weight: 600; margin: 1.3rem 0 .4rem; page-break-after: avoid; }

p { margin: 0 0 .75rem; }
strong { font-weight: 600; }

a { color: var(--accent); text-decoration: none; }

ul, ol { margin: 0 0 .8rem; padding-left: 1.1rem; }
li { margin-bottom: .3rem; }

/* The lede line under the title */
blockquote {
  margin: 1.1rem 0;
  padding: .75rem 1rem;
  background: var(--write-soft);
  border-left: 3px solid var(--write);
  border-radius: 0 4px 4px 0;
  page-break-inside: avoid;
}
blockquote p { margin: 0; font-size: 9.5pt; }
h2 + p + blockquote, h2 ~ blockquote {
  background: var(--surface);
  border-left-color: var(--accent-bright);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: .8rem 0 1.1rem;
  font-size: 9pt;
  page-break-inside: avoid;
}
th {
  text-align: left;
  font-weight: 600;
  border-bottom: 1.5px solid var(--ink);
  padding: .4rem .5rem;
}
td { border-bottom: 1px solid var(--border); padding: .4rem .5rem; vertical-align: top; }
tr:nth-child(even) td { background: #fafbfc; }

code {
  font-family: 'JetBrains Mono', monospace;
  font-size: .87em;
  background: var(--surface);
  padding: .08em .32em;
  border-radius: 3px;
}
td code { background: none; padding: 0; }

pre {
  background: var(--ink);
  color: #eceef0;
  padding: 1rem 1.1rem;
  border-radius: 5px;
  overflow-x: auto;
  font-size: 7.6pt;
  line-height: 1.5;
  page-break-inside: avoid;
}
pre code { background: none; color: inherit; padding: 0; font-size: inherit; }

img {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 5px;
  margin: .8rem 0 .4rem;
  page-break-inside: avoid;
}
/* Caption = the paragraph immediately after an image paragraph. Scoped tightly
   so ordinary italics inside body text are left alone. */
p:has(> img) + p em {
  display: block;
  font-size: 8.5pt;
  color: var(--muted);
  font-style: normal;
  line-height: 1.45;
  margin-bottom: 1rem;
}

hr { border: 0; border-top: 1px solid var(--border); margin: 1.6rem 0; display: none; }

@page { size: A4; margin: 15mm 10mm 14mm; }
@media print { body { font-size: 10pt; } }
`;

const { existsSync } = await import("node:fs");
const browser = CANDIDATES.find((c) => existsSync(c));

if (!browser) {
  console.error("No Chromium-family browser found. Open the HTML files and print to PDF manually.");
}

marked.setOptions({ gfm: true });

for (const edition of EDITIONS.filter((e) => e.md.includes(FILTER))) {
  const srcPath = join(ROOT, "docs", edition.md);
  const htmlPath = join(ROOT, "docs", edition.html);
  const pdfPath = join(ROOT, "docs", edition.pdf);

  // Internal editions live outside the repository; skip them when absent.
  let source;
  try {
    source = await readFile(srcPath, "utf8");
  } catch {
    console.log(`skip  → ${edition.md} (not present)`);
    continue;
  }

  const body = marked.parse(source);
  const title = edition.md.startsWith("mcp")
    ? "Relay \u2014 MCP"
    : edition.md.includes("jorge")
      ? edition.lang === "es"
        ? "Relay \u2014 Gu\u00eda para Jorge"
        : "Relay \u2014 Jorge's Guide"
    : edition.lang === "es"
      ? "Relay \u2014 Agente de Operaciones \u00b7 Caso de estudio"
      : "Relay \u2014 Operations Agent \u00b7 Case Study";

  const html = `<!doctype html>
<html lang="${edition.lang}"><head><meta charset="utf-8">
<title>${title}</title>
<style>${CSS}</style>
</head><body><div class="page">${body}</div></body></html>`;

  await writeFile(htmlPath, html, "utf8");
  console.log(`HTML  \u2192 ${htmlPath}`);

  if (!browser) continue;

  try {
    await run(browser, [
      "--headless",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdfPath}`,
      `file://${htmlPath}`,
    ]);
    console.log(`PDF   \u2192 ${pdfPath}`);
  } catch (error) {
    console.error(`PDF step failed for ${edition.md}. Print the HTML from a browser instead.`);
    console.error(error instanceof Error ? error.message : error);
  }
}
