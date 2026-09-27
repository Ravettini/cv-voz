import { createRequire } from "node:module";
import type { Browser } from "puppeteer";
import type { ResumeContent, TemplateId } from "@cv-voz/shared";
import { logger } from "../../utils/logger.js";
import { renderResumeHtml } from "./htmlTemplates.js";

const require = createRequire(import.meta.url);
let browserPromise: Promise<Browser> | null = null;

async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    chromium.setGraphicsMode = false;
    const puppeteer = await import("puppeteer-core");
    return puppeteer.default.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const puppeteer = require("puppeteer") as typeof import("puppeteer");
  return puppeteer.launch({
    headless: true,
    timeout: 20000,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--font-render-hinting=none"],
  });
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    logger.info("Abriendo Chrome para el PDF");
    browserPromise = launchBrowser().catch((err: unknown) => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

const A4_HEIGHT_PX = (297 * 96) / 25.4;
const MIN_FIT = 0.6;
const MAX_FIT = 2.05;
const FILL = 0.97;

/**
 * Agranda o achica el CV para que ocupe casi toda la A4.
 * El ancho se compensa para que el texto no se salga por los costados.
 */
async function fitSinglePage(page: import("puppeteer").Page): Promise<void> {
  const fit = await page.evaluate((min: number, max: number, fill: number) => {
    const node = document.getElementById("cv-fit");
    const pageHeight = (297 * 96) / 25.4;
    if (!node || !pageHeight) return { scale: 1, ratio: 1 };

    let low = min;
    let high = max;
    let ratio = 1;
    for (let i = 0; i < 10; i++) {
      const mid = (low + high) / 2;
      document.documentElement.style.zoom = String(mid);
      node.style.width = `${210 / mid}mm`;
      ratio = node.getBoundingClientRect().height / pageHeight;
      if (ratio > fill) high = mid;
      else low = mid;
    }

    document.documentElement.style.zoom = String(low);
    node.style.width = `${210 / low}mm`;
    ratio = node.getBoundingClientRect().height / pageHeight;
    return { scale: low, ratio };
  }, MIN_FIT, MAX_FIT, FILL);

  logger.info("Ajuste de hoja", {
    scale: Number(fit.scale.toFixed(3)),
    ratio: Number(fit.ratio.toFixed(3)),
  });
}

export async function renderResumePdf(content: ResumeContent, templateId: TemplateId): Promise<Buffer> {
  const html = renderResumeHtml(content, templateId);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 794, height: 4000, deviceScaleFactor: 1 });
    await page.emulateMediaType("print");
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    await fitSinglePage(page);
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
