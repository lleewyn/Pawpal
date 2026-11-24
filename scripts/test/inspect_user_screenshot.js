const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    const filePath = 'file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4/.user_uploaded/uploaded_media_1795517037057.png';
    await page.goto(filePath);

    // Let's sample colors in the main image wrapper area of the screenshot
    // The screenshot has width and height:
    const data = await page.evaluate(() => {
        const img = document.querySelector('img');
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Let's sample around the gallery area:
        // In full screenshot (approx 1920x1080 or 2560x1440):
        // The gallery is on the left side, below header (y around 350 to 700, x around 200 to 600)
        const samples = [];
        for (let y = 350; y < 700; y += 50) {
            for (let x = 200; x < 600; x += 100) {
                const pixel = ctx.getImageData(x, y, 1, 1).data;
                samples.push({ x, y, r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] });
            }
        }
        return {
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            samples
        };
    });

    console.log('User screenshot dimensions:', data.naturalWidth, 'x', data.naturalHeight);
    console.log('Sample pixels in gallery area:', data.samples.slice(0, 10));

    await browser.close();
})();
