const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    try {
        await page.goto('http://localhost:3000/pages/services/service-detail/service-detail.html?id=SPA01', { waitUntil: 'networkidle0' });
        console.log("Page loaded successfully.");
        
        const html = await page.evaluate(() => document.querySelector('.summary-panel')?.innerHTML);
        console.log("Summary Panel HTML:", html);
        
    } catch (e) {
        console.error("Puppeteer script error:", e);
    }
    
    await browser.close();
})();
