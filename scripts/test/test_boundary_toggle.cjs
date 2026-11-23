const fs = require('fs');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    
    await page.route('**/*', route => {
        const u = new URL(route.request().url());
        if (u.pathname === '/components/fab/fab.css') {
            return route.fulfill({ contentType: 'text/css', body: fs.readFileSync('components/fab/fab.css', 'utf8') });
        }
        return route.fulfill({ contentType: 'text/html', body: '' });
    });
    
    const html = `<!doctype html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="stylesheet" href="/components/fab/fab.css">
    </head>
    <body style="background:#F4FAF6;margin:0;padding:0;min-height:100vh;">
      ${fs.readFileSync('components/fab/fab.html', 'utf8')}
    </body>
    </html>`;
    
    await page.setContent(html);
    await page.addScriptTag({ content: fs.readFileSync('components/fab/fab.js', 'utf8') });
    
    // Open chat panel
    await page.click('#fabAiBtn');
    await page.waitForTimeout(300);
    
    const panel = page.locator('#fabChatPanel');
    
    // Capture state 1: Expanded
    await panel.screenshot({ path: 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/minh_chung_dong_mo_1_mo_rong.png' });
    
    // Click toggle button to collapse
    await page.click('#fabSupportToggleBtn');
    await page.waitForTimeout(300);
    
    // Capture state 2: Collapsed
    await panel.screenshot({ path: 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/minh_chung_dong_mo_2_thu_gon.png' });
    
    console.log('SUCCESS: Captured minh_chung_dong_mo_1_mo_rong.png and minh_chung_dong_mo_2_thu_gon.png');
    await browser.close();
})();
