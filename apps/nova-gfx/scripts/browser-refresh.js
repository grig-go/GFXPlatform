import puppeteer from 'puppeteer';

async function refreshBrowser() {
  console.log('🔄 Refreshing Nova GFX in Chrome...\n');

  try {
    // Connect to existing Chrome instance
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();

    // Find the page with our app
    let appPage = null;
    for (const page of pages) {
      const url = page.url();
      if (url.includes('localhost:5173')) {
        appPage = page;
        break;
      }
    }

    if (appPage) {
      console.log('📍 Found app page, refreshing...');
      await appPage.reload({ waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 2000));

      // Take screenshot after refresh
      await appPage.screenshot({ path: 'refresh-screenshot.png' });
      console.log('📸 Screenshot saved: refresh-screenshot.png');

      // Check viewport dimensions
      const dimensions = await appPage.evaluate(() => ({
        windowHeight: window.innerHeight,
        windowWidth: window.innerWidth,
        bodyHeight: document.body.scrollHeight,
        rootHeight: document.getElementById('root')?.offsetHeight || 0
      }));

      console.log('\n📏 Dimensions after refresh:');
      console.log(`   Window: ${dimensions.windowWidth} x ${dimensions.windowHeight}`);
      console.log(`   Body scroll height: ${dimensions.bodyHeight}`);
      console.log(`   #root height: ${dimensions.rootHeight}`);

      if (dimensions.rootHeight >= dimensions.windowHeight * 0.95) {
        console.log('\n✅ Height responsiveness looks good!');
      } else {
        console.log('\n⚠️ Root element may not be filling viewport');
      }

    } else {
      console.log('❌ Could not find Nova GFX page');
      console.log('Available pages:');
      for (const page of pages) {
        console.log(`   - ${page.url()}`);
      }
    }

    // Disconnect (don't close browser)
    browser.disconnect();
    console.log('\n✅ Done! Browser still open.');

  } catch (error) {
    if (error.message.includes('connect')) {
      console.log('❌ Could not connect to Chrome.');
      console.log('   Make sure Chrome was launched with --remote-debugging-port=9222');
      console.log('   Or run: node scripts/browser-automation.js');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

refreshBrowser();
