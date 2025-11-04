// watch-export.mjs
import chokidar from 'chokidar';
import path from 'node:path';
import puppeteer from 'puppeteer';

const HTML_PATH = process.env.HTML_PATH || './StickmanBrawl_PostMortem.html';
const OUT_PDF = process.env.OUT_PDF || './StickmanBrawl_PostMortem.pdf';
const CSS_PATH = process.env.CSS_PATH || './StickmanBrawl_PostMortem.css';

let browser = null;
let busy = false;
let timer = null;

async function exportPdf() {
  if (busy) return;
  busy = true;
  try {
    if (!browser) {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-gpu']
      });
    }
    const page = await browser.newPage();

    // Charge le HTML en file://
    const fileUrl = 'file://' + path.resolve(HTML_PATH).replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Date du jour (français long, ex : "3 novembre 2025")
    const today = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Auteur
    const author = 'Antonin Claudel';

    // Génération PDF
    await page.pdf({
      path: path.resolve(OUT_PDF),
      format: 'Letter',
      printBackground: true,
      margin: { top: '18mm', right: '16mm', bottom: '20mm', left: '16mm' },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="
          font-family: 'Segoe UI', system-ui, sans-serif;
          font-size: 10px;
          width: 100%;
          text-align: center;
          color: #444;
          padding-top: 4mm;
        ">
          Stickman Brawl — Post-mortem
        </div>`,
      footerTemplate: `
        <div style="
          font-family: 'Segoe UI', system-ui, sans-serif;
          font-size: 10px;
          width: 100%;
          color: #444;
          padding: 0 8mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div style="text-align: left;">${today}</div>
          <div style="text-align: center;">${author}</div>
          <div style="text-align: right;">
            Page <span class="pageNumber"></span>/<span class="totalPages"></span>
          </div>
        </div>`,
    });

    await page.close();
    console.log(`→ PDF OK: ${path.resolve(OUT_PDF)}`);
  } catch (e) {
    console.error('✗ Échec export:', e.message);
  } finally {
    busy = false;
  }
}

function debouncedExport() {
  clearTimeout(timer);
  timer = setTimeout(exportPdf, 300);
}

(async function main() {
  // Première exportation
  await exportPdf();

  // Watch HTML + CSS
  const watcher = chokidar.watch([HTML_PATH, CSS_PATH], { ignoreInitial: true });
  watcher.on('all', (event, file) => {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.html' || ext === '.htm' || ext === '.css') {
      console.log(`[${new Date().toLocaleTimeString()}] ${event}: ${file}`);
      debouncedExport();
    }
  });
})();
