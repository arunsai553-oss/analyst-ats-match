import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log("🚀 Starting E2E Test for 1000 IQ Version...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const url = 'https://arunsai553-oss.github.io/analyst-ats-match/';
  console.log(`🔗 Navigating to ${url}`);
  await page.goto(url);
  
  // Wait for the app to be ready and check version
  await page.waitForSelector('h1');
  const versionText = await page.locator('.text-success').innerText();
  console.log(`✅ Page loaded. Version found: ${versionText}`);

  const filePath = path.join(__dirname, 'test_resume.pdf');
  console.log(`📦 Uploading file to Bulk Zone: ${filePath}`);
  
  // Find the bulk input
  const bulkInput = await page.locator('#bulk-input');
  await bulkInput.setInputFiles(filePath);
  
  console.log("⏳ Waiting for bulk extraction...");
  
  try {
    // Wait for the textarea to be populated
    const textarea = page.locator('textarea').first();
    await page.waitForFunction(
      el => el.value && el.value.length > 5,
      await textarea.elementHandle(),
      { timeout: 15000 }
    );
    
    const content = await textarea.inputValue();
    console.log(`📝 Extracted Content: "${content.trim()}"`);
    
    if (content.includes('Test Resume Content')) {
      console.log("🏆 TEST PASSED: 1000 IQ Version is working!");
      await page.screenshot({ path: 'test_1000iq_success.png', fullPage: true });
    } else {
      console.log("❌ TEST FAILED: Content mismatch.");
      await page.screenshot({ path: 'test_1000iq_fail.png', fullPage: true });
    }
  } catch (err) {
    console.log(`❌ TEST ERROR: ${err.message}`);
    await page.screenshot({ path: 'test_1000iq_error.png', fullPage: true });
  }

  await browser.close();
})();
