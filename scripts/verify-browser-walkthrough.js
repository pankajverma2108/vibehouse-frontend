/**
 * Comprehensive Browser Walkthrough Verification Script
 *
 * Uses puppeteer-core to connect directly to the active Chrome instance
 * at http://localhost:9222 or launch it if disconnected.
 *
 * Navigates to all guest routes, validates live rendering, checks for errors,
 * and captures full-resolution screenshots into the brain artifact directory.
 */

import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\Pankaj\\.gemini\\antigravity-ide\\brain\\17312d38-9ccd-4a3f-bd1d-501b1828c7bb';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ROUTES = [
  {
    name: '01_homepage',
    url: 'http://localhost:3000/',
    desc: 'Homepage (Hero, Amenities, Room Showcase)',
  },
  {
    name: '02_rooms_catalog',
    url: 'http://localhost:3000/rooms',
    desc: 'Rooms Catalog (4-Bed Dorm, Deluxe Room with live pricing)',
  },
  {
    name: '03_events_page',
    url: 'http://localhost:3000/events',
    desc: 'Public Community Events (Seeded from PostgreSQL)',
  },
  {
    name: '04_coliving_page',
    url: 'http://localhost:3000/colive',
    desc: 'Coliving Search & Onboarding Flow',
  },
  {
    name: '05_guest_feedback',
    url: 'http://localhost:3000/feedback/61e77edfa12ea7074f1be9538db676386a8a3779a0ec1ac1bc4dd1ef17eebaf3',
    desc: 'Token-based Guest Feedback / CSAT Form',
  },
  {
    name: '06_breakfast_order',
    url: 'http://localhost:3000/breakfast/bd81a5fd157362831de81719168a0d1b61ea8229a9023c67caf25a5ff521c719',
    desc: 'Token-based Breakfast Ordering (Dishes & Delivery Slots)',
  },
  {
    name: '07_web_check_in',
    url: 'http://localhost:3000/bookings/EZEE-KA-2026-001/web-check-in',
    desc: 'Guest KYC & Web Check-In Portal',
  },
  {
    name: '08_booking_confirmed',
    url: 'http://localhost:3000/bookings/EZEE-KA-2026-001/confirmed',
    desc: 'Booking Confirmation Receipt Page',
  },
];

async function main() {
  console.log('\n=============================================================');
  console.log('  STARTING AUTOMATED CHROME BROWSER WALKTHROUGH VERIFICATION');
  console.log('=============================================================\n');

  let browser;
  try {
    console.log('Connecting to Chrome on http://localhost:9222...');
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: { width: 1280, height: 800 },
    });
    console.log('Connected to existing Chrome instance successfully!\n');
  } catch (err) {
    console.log('Could not connect to localhost:9222, launching Chrome with remote debugging...');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--remote-debugging-port=9222'],
      defaultViewport: { width: 1280, height: 800 },
    });
    console.log('Launched new Chrome browser instance.\n');
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const results = [];

  for (const route of ROUTES) {
    console.log(`--> Testing: ${route.desc}`);
    console.log(`    URL: ${route.url}`);

    try {
      const response = await page.goto(route.url, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });

      // Brief pause to allow React hydration and images to settle
      await new Promise((r) => setTimeout(r, 2500));

      const status = response ? response.status() : 200;
      const title = await page.title();

      // Check for unhandled React error overlay or fatal errors
      const errorDetails = await page.evaluate(() => {
        try {
          const bodyText = document.body ? (document.body.innerText || '') : '';
          const portal = document.querySelector('nextjs-portal');
          let portalHasError = false;
          if (portal && portal.shadowRoot) {
            portalHasError = portal.shadowRoot.querySelector('[data-nextjs-dialog]') !== null ||
                             portal.shadowRoot.querySelector('.nextjs-container-errors-header') !== null;
          }
          const hasUnhandled =
            bodyText.includes('Unhandled Runtime Error') ||
            bodyText.includes('Application error: a client-side exception');
          return {
            hasError: portalHasError || hasUnhandled,
            portalHasError,
            hasUnhandled,
          };
        } catch {
          return { hasError: false };
        }
      });
      const hasErrorOverlay = errorDetails.hasError;

      // Extract a representative text snippet
      const snippet = await page.evaluate(() => {
        const h1 = document.querySelector('h1')?.innerText;
        const h2 = document.querySelector('h2')?.innerText;
        return h1 || h2 || document.body.innerText.slice(0, 100).replace(/\s+/g, ' ');
      });

      const screenshotFilename = `${route.name}.png`;
      const screenshotPath = path.join(ARTIFACT_DIR, screenshotFilename);

      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });

      console.log(`    Status: HTTP ${status}`);
      console.log(`    Title:  "${title}"`);
      console.log(`    Header: "${snippet}"`);
      console.log(`    Errors: ${hasErrorOverlay ? 'YES (FAILED)' : 'NONE (CLEAN)'}`);
      console.log(`    Screenshot: ${screenshotFilename}\n`);

      results.push({
        ...route,
        status,
        title,
        snippet,
        hasErrorOverlay,
        screenshotFilename,
        screenshotPath,
        passed: status >= 200 && status < 400 && !hasErrorOverlay,
      });
    } catch (routeErr) {
      console.error(`    FAILED: ${routeErr.message}\n`);
      results.push({
        ...route,
        status: 500,
        hasErrorOverlay: true,
        error: routeErr.message,
        passed: false,
      });
    }
  }

  await page.close();

  console.log('=============================================================');
  console.log('  BROWSER WALKTHROUGH RESULTS SUMMARY');
  console.log('=============================================================');

  let allPassed = true;
  for (const r of results) {
    const symbol = r.passed ? '✓ [PASS]' : '✗ [FAIL]';
    console.log(`${symbol} ${r.desc}`);
    if (!r.passed) allPassed = false;
  }

  console.log('=============================================================\n');

  if (!allPassed) {
    console.error('Some routes failed browser verification!');
    process.exit(1);
  } else {
    console.log('All routes rendered cleanly in Chrome with ZERO fatal errors!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Walkthrough script fatal error:', err);
  process.exit(1);
});
