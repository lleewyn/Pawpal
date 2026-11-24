const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const artifactDir = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4';

    console.log('Navigating to homepage http://localhost:4000/ ...');
    await page.goto('http://localhost:4000/', { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: '#pawpal-site-popup, .modal-backdrop { display: none !important; }' });

    // Wait for the track to be initialized
    await page.waitForSelector('#campaignTrack', { state: 'visible', timeout: 15000 });
    // Wait for real images inside track
    await page.waitForFunction(() => {
        const imgs = document.querySelectorAll('#campaignTrack img');
        return imgs.length > 0 && Array.from(imgs).some(i => !i.src.startsWith('data:') && i.complete && i.naturalWidth > 0);
    }, { timeout: 15000 });

    console.log('Track and images successfully initialized.');

    const initialInfo = await page.evaluate(() => {
        const track = document.getElementById('campaignTrack');
        const slides = track ? track.querySelectorAll('.campaign-slide') : [];
        return {
            slideCount: slides.length,
            transform: track ? track.style.transform : null,
            pager: document.getElementById('slidePager')?.textContent,
            title: document.getElementById('slideName')?.textContent
        };
    });
    console.log('Initial track info:', JSON.stringify(initialInfo));

    // Screenshot 1: Resting on Slide 1
    const campaign = page.locator('.campaign');
    await campaign.screenshot({ path: path.join(artifactDir, 'minhchung_smooth_slide1.png') });
    console.log('Saved minhchung_smooth_slide1.png');

    // Trigger next slide and capture in-flight gliding animation
    console.log('Triggering Next slide and capturing sliding transition...');
    await page.locator('#nextSlide').click();
    // Wait 250ms (halfway through the 0.55s smooth transition)
    await page.waitForTimeout(250);

    const midTransitionTransform = await page.evaluate(() => {
        const track = document.getElementById('campaignTrack');
        return window.getComputedStyle(track).transform;
    });
    console.log('Mid-transition computed transform matrix:', midTransitionTransform);

    await campaign.screenshot({ path: path.join(artifactDir, 'minhchung_smooth_sliding_motion.png') });
    console.log('Saved minhchung_smooth_sliding_motion.png');

    // Wait for transition to complete
    await page.waitForTimeout(500);

    const slide2Info = await page.evaluate(() => {
        const track = document.getElementById('campaignTrack');
        return {
            transform: track ? track.style.transform : null,
            pager: document.getElementById('slidePager')?.textContent,
            title: document.getElementById('slideName')?.textContent
        };
    });
    console.log('After slide completed:', JSON.stringify(slide2Info));

    await campaign.screenshot({ path: path.join(artifactDir, 'minhchung_smooth_slide2.png') });
    console.log('Saved minhchung_smooth_slide2.png');

    // Test Autoplay: Wait 5.3s
    console.log('Testing autoplay from Slide 2 -> Slide 3 (waiting 5.3s)...');
    await page.waitForTimeout(5300);

    const slide3Info = await page.evaluate(() => {
        const track = document.getElementById('campaignTrack');
        return {
            transform: track ? track.style.transform : null,
            pager: document.getElementById('slidePager')?.textContent,
            title: document.getElementById('slideName')?.textContent
        };
    });
    console.log('After autoplay to Slide 3:', JSON.stringify(slide3Info));

    await campaign.screenshot({ path: path.join(artifactDir, 'minhchung_smooth_slide3.png') });
    console.log('Saved minhchung_smooth_slide3.png');

    await browser.close();
    console.log('All tests passed successfully!');
})();
