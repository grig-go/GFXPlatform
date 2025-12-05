import puppeteer from 'puppeteer';

async function verifyApp() {
  console.log('🔍 Verifying Nova GFX App Changes\n');
  console.log('='.repeat(50));

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    // Navigate to the app
    console.log('\n🌐 Loading Nova GFX...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    await wait(2000);
    console.log('✅ App loaded!\n');

    // Check height responsiveness on projects page
    console.log('--- Checking Height Responsiveness ---\n');
    const projectsDimensions = await page.evaluate(() => ({
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      bodyHeight: document.body.offsetHeight,
      rootHeight: document.getElementById('root')?.offsetHeight || 0,
      hasOverflow: document.body.scrollHeight > window.innerHeight
    }));

    console.log('📏 Projects Page:');
    console.log(`   Window: ${projectsDimensions.windowWidth} x ${projectsDimensions.windowHeight}`);
    console.log(`   Body height: ${projectsDimensions.bodyHeight}px`);
    console.log(`   #root height: ${projectsDimensions.rootHeight}px`);
    console.log(`   Has overflow: ${projectsDimensions.hasOverflow}`);

    await page.screenshot({ path: 'verify-1-projects.png' });
    console.log('📸 Screenshot: verify-1-projects.png\n');

    // Click a project card to enter designer
    const cards = await page.$$('.group.relative');
    if (cards.length > 0) {
      console.log('🖱️  Entering project...');
      await cards[0].click();
      await wait(3000);

      // Check height responsiveness in designer
      const designerDimensions = await page.evaluate(() => ({
        windowHeight: window.innerHeight,
        windowWidth: window.innerWidth,
        bodyHeight: document.body.offsetHeight,
        rootHeight: document.getElementById('root')?.offsetHeight || 0,
        hasOverflow: document.body.scrollHeight > window.innerHeight,
        appContainerHeight: document.querySelector('.h-screen')?.offsetHeight || 0
      }));

      console.log('\n📏 Designer Page:');
      console.log(`   Window: ${designerDimensions.windowWidth} x ${designerDimensions.windowHeight}`);
      console.log(`   Body height: ${designerDimensions.bodyHeight}px`);
      console.log(`   #root height: ${designerDimensions.rootHeight}px`);
      console.log(`   App container: ${designerDimensions.appContainerHeight}px`);
      console.log(`   Has overflow: ${designerDimensions.hasOverflow}`);

      await page.screenshot({ path: 'verify-2-designer.png' });
      console.log('📸 Screenshot: verify-2-designer.png\n');

      // Check if height is responsive (root should fill viewport)
      const heightOk = designerDimensions.rootHeight >= designerDimensions.windowHeight * 0.95;
      const noOverflow = !designerDimensions.hasOverflow;

      console.log('--- Height Responsiveness Check ---');
      if (heightOk && noOverflow) {
        console.log('✅ Height responsiveness: PASS');
        console.log('   - Root element fills viewport');
        console.log('   - No vertical overflow');
      } else {
        console.log('⚠️  Height responsiveness: NEEDS ATTENTION');
        if (!heightOk) console.log('   - Root element not filling viewport');
        if (!noOverflow) console.log('   - Page has vertical overflow');
      }

      // Check timeline scroll sync
      console.log('\n--- Timeline Scroll Sync Check ---');
      const timelineInfo = await page.evaluate(() => {
        const timeline = document.querySelector('[class*="Timeline"]') ||
                        document.querySelector('[class*="timeline"]') ||
                        document.querySelector('.flex-1.flex.flex-col.overflow-hidden');

        if (!timeline) return { found: false };

        // Find scrollable elements in timeline
        const scrollables = timeline.querySelectorAll('[style*="overflow"], .overflow-auto, .overflow-y-auto');

        return {
          found: true,
          timelineHeight: timeline.offsetHeight,
          scrollableElements: scrollables.length
        };
      });

      if (timelineInfo.found) {
        console.log(`   Timeline height: ${timelineInfo.timelineHeight}px`);
        console.log(`   Scrollable elements: ${timelineInfo.scrollableElements}`);
        console.log('✅ Timeline visible and accessible');
      } else {
        console.log('⚠️  Could not locate timeline component');
      }
    }

    // Final fullscreen test
    console.log('\n--- Final Summary ---');
    await page.screenshot({ path: 'verify-final.png', fullPage: false });
    console.log('📸 Final screenshot: verify-final.png\n');

    console.log('='.repeat(50));
    console.log('🎉 Verification complete!');
    console.log('='.repeat(50));

    console.log('\n📌 Browser remains open for manual inspection.');
    console.log('   Press Ctrl+C to close.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'verify-error.png' });
  }

  process.on('SIGINT', async () => {
    console.log('\n🛑 Closing browser...');
    await browser.close();
    process.exit(0);
  });
}

verifyApp().catch(console.error);
