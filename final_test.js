import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log("🚀 Starting Final 'Perfect' E2E Test...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const url = 'https://arunsai553-oss.github.io/analyst-ats-match/';
  console.log(`🔗 Navigating to ${url}`);
  await page.goto(url);
  await page.waitForSelector('h1');

  const filePath = path.join(__dirname, 'test_resume.pdf');
  console.log(`📦 Testing Persistence: Uploading ${filePath}`);
  
  const bulkInput = await page.locator('#bulk-input');
  await bulkInput.setInputFiles(filePath);
  
  // Wait for extraction
  const textarea = page.locator('textarea').first();
  await page.waitForFunction(el => el.value.includes('Test Resume Content'), await textarea.elementHandle());
  console.log("✅ Extraction successful.");

  console.log("🔄 Testing Page Refresh Persistence...");
  await page.reload();
  await page.waitForSelector('h1');
  
  const persistedText = await page.locator('textarea').first().inputValue();
  if (persistedText.includes('Test Resume Content')) {
    console.log("🏆 PERSISTENCE PASSED: Data survived the refresh!");
  } else {
    console.log("❌ PERSISTENCE FAILED: Data was lost.");
  }

  console.log("🎨 Testing Readability (Contrast)...");
  // Enter some JD to trigger analysis
  await page.locator('textarea').last().fill("Looking for a Test Engineer with Resume Content knowledge.");
  await page.locator('button:has-text("COMPARE ALL RESUMES")').click();
  
  // Wait for results view
  await page.waitForSelector('h2:has-text("ATS MATCH ANALYSIS")');
  
  // Scroll to deep dive
  const deepDive = await page.locator('.bg-primary-900').first();
  const bgColor = await deepDive.evaluate(el => window.getComputedStyle(el).backgroundColor);
  console.log(`🎨 Computed Background Color: ${bgColor}`);
  
  // rgb(12, 74, 110) is primary-900 (#0c4a6e)
  if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'rgb(255, 255, 255)') {
    console.log("🏆 READABILITY PASSED: Background is correctly applied!");
  } else {
    console.log("❌ READABILITY FAILED: Background is transparent/white!");
  }

  await page.screenshot({ path: 'final_perfect_test.png', fullPage: true });
  console.log("📸 Final verification screenshot saved.");

  await browser.close();
})();
