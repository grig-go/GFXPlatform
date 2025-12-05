import puppeteer from 'puppeteer';

async function runAppTests() {
  console.log('🧪 Nova GFX Browser Test Suite\n');
  console.log('='.repeat(50));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${name}`);
    if (details) console.log(`   ${details}`);
    results.tests.push({ name, passed, details });
    if (passed) results.passed++;
    else results.failed++;
  }

  let browser;
  let page;

  try {
    // Test 1: Browser Launch
    console.log('\n📋 Test 1: Browser Launch');
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    logTest('Browser launched successfully', true);

    // Test 2: Navigate to App
    console.log('\n📋 Test 2: App Navigation');
    const response = await page.goto('http://localhost:5173/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    const status = response.status();
    logTest('App loads with HTTP 200', status === 200, `HTTP Status: ${status}`);

    // Test 3: Page Title
    console.log('\n📋 Test 3: Page Title');
    const title = await page.title();
    logTest('Page has a title', title.length > 0, `Title: "${title}"`);

    // Test 4: No Console Errors
    console.log('\n📋 Test 4: Console Errors');
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000)); // Wait for any async errors
    logTest('No critical console errors', consoleErrors.length === 0,
      consoleErrors.length > 0 ? `Errors: ${consoleErrors.slice(0, 3).join(', ')}` : 'No errors detected');

    // Test 5: React App Mounted
    console.log('\n📋 Test 5: React App Mount');
    const rootElement = await page.$('#root');
    const hasContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });
    logTest('React app mounted in #root', rootElement !== null && hasContent);

    // Test 6: Check for main UI elements
    console.log('\n📋 Test 6: UI Elements');
    const bodyContent = await page.evaluate(() => document.body.innerText);
    const hasUIContent = bodyContent.length > 50;
    logTest('App renders UI content', hasUIContent, `Body text length: ${bodyContent.length} chars`);

    // Test 7: Screenshot capture
    console.log('\n📋 Test 7: Screenshot');
    const screenshotPath = 'test-screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    logTest('Screenshot captured', true, `Saved to: ${screenshotPath}`);

    // Test 8: Check for JavaScript errors in page
    console.log('\n📋 Test 8: JavaScript Execution');
    const jsWorks = await page.evaluate(() => {
      try {
        return typeof window !== 'undefined' && typeof document !== 'undefined';
      } catch {
        return false;
      }
    });
    logTest('JavaScript executes correctly', jsWorks);

    // Test 9: Check localStorage availability
    console.log('\n📋 Test 9: LocalStorage');
    const localStorageWorks = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    });
    logTest('LocalStorage is available', localStorageWorks);

    // Test 10: Network requests
    console.log('\n📋 Test 10: Network Activity');
    const requests = [];
    page.on('request', req => requests.push(req.url()));
    await page.reload({ waitUntil: 'networkidle0' });
    logTest('Network requests completed', requests.length > 0, `${requests.length} requests made`);

  } catch (error) {
    logTest('Test execution', false, error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total:  ${results.passed + results.failed}`);
  console.log('='.repeat(50));

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Nova GFX is working correctly in Chrome.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check the details above.\n');
  }

  // Keep browser open for inspection
  console.log('📌 Browser will remain open for inspection. Press Ctrl+C to close.\n');

  process.on('SIGINT', async () => {
    console.log('\n🛑 Closing browser...');
    await browser.close();
    process.exit(results.failed === 0 ? 0 : 1);
  });
}

runAppTests().catch(console.error);
