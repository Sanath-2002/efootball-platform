import { Browser, chromium } from 'playwright';

let browser: Browser | null = null;
let launching: Promise<Browser> | null = null;

export const getBrowser = async (): Promise<Browser> => {
  if (browser?.isConnected()) return browser;
  if (launching) return launching;

  launching = chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  browser = await launching;
  launching = null;
  return browser;
};

export const closeBrowser = async (): Promise<void> => {
  if (browser) {
    await browser.close();
    browser = null;
  }
};

process.on('beforeExit', () => {
  void closeBrowser();
});
