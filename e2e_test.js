import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log("🚀 Starting E2E Test for PDF Upload...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const url = 'https://arunsai553-oss.github.io/analyst-ats-match/';
  console.log(`🔗 Navigating to ${url}`);
  await page.goto(url);
  
  // Wait for the app to be ready
  await page.waitForSelector('h1');
  console.log("✅ Page loaded.");

  // The input is hidden, but Playwright can set files on it
  const filePath = path.join(__dirname, 'test_resume.pdf');
  console.log(`uploading file: ${filePath}`);
  
  // Find the file input. It's inside a label typically or just a hidden input.
  // In our code: <input type="file" className="hidden" accept=".pdf,.docx,.txt" ... />
  const fileInput = await page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(filePath);
  
  console.log("⏳ Waiting for extraction...");
  // Wait for the loading state to finish (the button text changes from 'EXTRACTING...' back to 'UPLOAD PDF/DOCX')
  // Or just wait for the textarea to have content.
  const textarea = await page.locator('textarea').first();
  
  // Wait up to 10 seconds for text to appear
  await page.waitForFunction(
    el => el.value.includes('Test Resume Content'),
    await textarea.elementHandle(),
    { timeout: 10000 }
  );
  
  const content = await textarea.inputValue();
  console.log(`📝 Extracted Content: "${content.trim()}"`);
  
  if (content.includes('Test Resume Content')) {
    console.log("🏆 TEST PASSED: PDF text successfully extracted!");
    await page.screenshot({ path: 'test_result_success.png', fullPage: true });
    console.log("📸 Screenshot saved as test_result_success.png");
  } else {
    console.log("❌ TEST FAILED: Content mismatch.");
  }

  await browser.close();
})();
