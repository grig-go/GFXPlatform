import puppeteer from 'puppeteer';

async function interactWithApp() {
  console.log('🎮 Nova GFX Interactive Browser Session\n');
  console.log('='.repeat(50));

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // Click by text content using evaluate
  const clickByText = async (text, tag = '*', description) => {
    try {
      console.log(`🖱️  Clicking: ${description || text}`);
      const clicked = await page.evaluate((searchText, tagName) => {
        const elements = document.querySelectorAll(tagName);
        for (const el of elements) {
          if (el.textContent.trim() === searchText || el.textContent.includes(searchText)) {
            el.click();
            return true;
          }
        }
        return false;
      }, text, tag);
      if (clicked) {
        await wait(600);
        return true;
      }
      console.log(`   ⚠️  Not found: ${text}`);
      return false;
    } catch (e) {
      console.log(`   ⚠️  Error: ${e.message}`);
      return false;
    }
  };

  // Click element at coordinates
  const clickAt = async (x, y, description) => {
    console.log(`🖱️  Clicking at (${x}, ${y}): ${description}`);
    await page.mouse.click(x, y);
    await wait(500);
  };

  // Click all buttons in sequence
  const clickAllButtons = async () => {
    const buttons = await page.$$('button');
    console.log(`   Found ${buttons.length} buttons`);
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      try {
        const box = await buttons[i].boundingBox();
        if (box && box.width > 10 && box.height > 10) {
          const text = await buttons[i].evaluate(el => el.textContent.trim().slice(0, 20));
          console.log(`   🖱️  Button ${i + 1}: "${text || 'icon'}"`);
          await buttons[i].click();
          await wait(400);
          await page.keyboard.press('Escape'); // Close any menus
          await wait(200);
        }
      } catch (e) {
        // Button may have been removed from DOM
      }
    }
  };

  try {
    // Navigate to the app
    console.log('\n🌐 Navigating to Nova GFX...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    await wait(2000);
    console.log('✅ App loaded!\n');

    await page.screenshot({ path: 'interact-1-homepage.png' });
    console.log('📸 Screenshot: interact-1-homepage.png\n');

    // ============================================
    // PROJECTS PAGE - Click first card
    // ============================================
    console.log('--- Projects Page ---\n');

    // Find and click a project card
    const cards = await page.$$('.group.relative');
    if (cards.length > 0) {
      console.log(`🖱️  Found ${cards.length} cards, clicking first one...`);
      await cards[0].click();
      await wait(3000);
      await page.screenshot({ path: 'interact-2-entered-project.png' });
      console.log('📸 Screenshot: interact-2-entered-project.png\n');
    }

    // ============================================
    // DESIGNER PAGE - Interact with UI
    // ============================================
    console.log('--- Designer Page ---\n');

    // Get page dimensions
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));

    // Click around the canvas area (center of page)
    console.log('Clicking around canvas area...');
    await clickAt(viewport.width / 2, viewport.height / 2, 'Center of canvas');
    await clickAt(viewport.width / 2 + 100, viewport.height / 2 + 50, 'Canvas element');
    await clickAt(viewport.width / 2 - 100, viewport.height / 2 - 50, 'Another spot');

    await page.screenshot({ path: 'interact-3-canvas-clicks.png' });
    console.log('📸 Screenshot: interact-3-canvas-clicks.png\n');

    // Click on sidebar buttons (left side ~50px from edge)
    console.log('Clicking sidebar buttons...');
    for (let y = 150; y < 500; y += 50) {
      await clickAt(30, y, `Sidebar button at y=${y}`);
    }

    await page.screenshot({ path: 'interact-4-sidebar.png' });
    console.log('📸 Screenshot: interact-4-sidebar.png\n');

    // Click on right panel buttons
    console.log('Clicking right panel...');
    for (let y = 150; y < 400; y += 60) {
      await clickAt(viewport.width - 200, y, `Right panel at y=${y}`);
    }

    await page.screenshot({ path: 'interact-5-right-panel.png' });
    console.log('📸 Screenshot: interact-5-right-panel.png\n');

    // Click top bar buttons
    console.log('Clicking top bar...');
    for (let x = 100; x < viewport.width - 100; x += 100) {
      await clickAt(x, 40, `Top bar at x=${x}`);
      await page.keyboard.press('Escape');
      await wait(200);
    }

    await page.screenshot({ path: 'interact-6-topbar.png' });
    console.log('📸 Screenshot: interact-6-topbar.png\n');

    // Click timeline area (bottom)
    console.log('Clicking timeline area...');
    for (let x = 200; x < viewport.width - 200; x += 150) {
      await clickAt(x, viewport.height - 100, `Timeline at x=${x}`);
    }

    await page.screenshot({ path: 'interact-7-timeline.png' });
    console.log('📸 Screenshot: interact-7-timeline.png\n');

    // Try clicking some buttons by their visible text
    console.log('\nClicking buttons by text...');
    await clickByText('Save', 'button', 'Save button');
    await page.keyboard.press('Escape');
    await wait(300);

    await clickByText('Preview', 'button', 'Preview button');
    await wait(500);
    await page.screenshot({ path: 'interact-8-preview-menu.png' });
    await page.keyboard.press('Escape');
    await wait(300);

    // Click buttons that might be dropdown triggers in top bar
    console.log('\nExploring dropdown menus...');
    const topBarButtons = await page.$$('header button, nav button, [class*="top"] button');
    console.log(`   Found ${topBarButtons.length} top bar buttons`);

    for (let i = 0; i < Math.min(topBarButtons.length, 8); i++) {
      try {
        await topBarButtons[i].click();
        await wait(400);
        await page.screenshot({ path: `interact-menu-${i + 1}.png` });
        console.log(`📸 Screenshot: interact-menu-${i + 1}.png`);
        await page.keyboard.press('Escape');
        await wait(200);
      } catch (e) {
        // Continue
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'interact-final.png' });
    console.log('\n📸 Final screenshot: interact-final.png\n');

    // ============================================
    // SUMMARY
    // ============================================
    console.log('='.repeat(50));
    console.log('🎉 Interactive session complete!');
    console.log('='.repeat(50));
    console.log('\nThe browser clicked through:');
    console.log('  ✅ Project cards on homepage');
    console.log('  ✅ Canvas area (multiple spots)');
    console.log('  ✅ Left sidebar buttons');
    console.log('  ✅ Right panel');
    console.log('  ✅ Top bar menus');
    console.log('  ✅ Timeline area');
    console.log('  ✅ Save and Preview buttons');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'interact-error.png' });
  }

  console.log('\n📌 Browser remains open for inspection. Press Ctrl+C to close.\n');

  process.on('SIGINT', async () => {
    console.log('\n🛑 Closing browser...');
    await browser.close();
    process.exit(0);
  });
}

interactWithApp().catch(console.error);
