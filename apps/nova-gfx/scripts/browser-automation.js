import puppeteer from 'puppeteer';

async function startBrowserAutomation() {
  console.log('🚀 Starting Chrome browser automation...');

  // Launch Chrome browser
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    defaultViewport: null, // Use full window size
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  // Create a new page
  const page = await browser.newPage();

  // Set viewport size
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('✅ Browser launched successfully!');
  console.log('📄 New page created');

  // Navigate to Nova GFX app
  console.log('🌐 Navigating to Nova GFX...');
  await page.goto('http://localhost:5173/');

  // Example: Take a screenshot
  // await page.screenshot({ path: 'screenshot.png' });

  // Example: Click an element
  // await page.click('button.submit');

  // Example: Type into an input
  // await page.type('#search-input', 'Hello World');

  // Example: Wait for an element
  // await page.waitForSelector('.loaded');

  // Example: Get page content
  // const content = await page.content();

  // Example: Evaluate JavaScript in the page
  // const title = await page.evaluate(() => document.title);

  // Keep browser open - press Ctrl+C to close
  console.log('\n📌 Browser is running. Press Ctrl+C to close.\n');

  // Handle cleanup on exit
  process.on('SIGINT', async () => {
    console.log('\n🛑 Closing browser...');
    await browser.close();
    process.exit(0);
  });

  return { browser, page };
}

// Run the automation
startBrowserAutomation().catch(console.error);
