import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve('portfolio-export/vibehouse/images');
fs.mkdirSync(outDir, { recursive: true });

const oldScreenshotsToDelete = [
  '01-homepage-hero-desktop.png',
  '02-homepage-mobile.png',
  '03-rooms-catalog-desktop.png',
  '04-property-details-desktop.png',
  '05-colive-duration-engine-desktop.png',
  '06-community-events-bento-desktop.png',
  '07-booking-checkout-desktop.png',
  '08-homepage-rooms-section-desktop.png',
  '09-partner-upcoming-desktop.png',
  'readme-hero-showcase.png',
  'readme-colive-engine.png',
  'readme-property-rooms.png',
  'readme-events-bento.png',
];

console.log('=== Step 1: Deleting Outdated Portfolio Screenshots ===');
for (const file of oldScreenshotsToDelete) {
  const filePath = path.join(outDir, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`  Deleted old screenshot: ${file}`);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForPageReady(page, delay = 2500) {
  try {
    await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
      }
    });
  } catch (e) {}
  await sleep(delay);
}

async function captureAll() {
  console.log('\n=== Step 2: Launching Headless Chrome (2x Retina Mode) ===');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=2',
    ],
  });

  const page = await browser.newPage();

  // 1. Desktop Homepage Hero (1440x900 @ 2x)
  try {
    console.log('\n[1/9] Capturing Desktop Homepage Hero...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('http://localhost:3005/', { waitUntil: 'networkidle2', timeout: 25000 });
    await waitForPageReady(page, 2500);
    const heroPath = path.join(outDir, '01-homepage-hero-desktop.png');
    await page.screenshot({ path: heroPath, type: 'png' });
    fs.copyFileSync(heroPath, path.join(outDir, 'readme-hero-showcase.png'));
    console.log('  ✓ Captured: 01-homepage-hero-desktop.png & readme-hero-showcase.png');
  } catch (err) {
    console.error('  ✗ Error on 01-homepage-hero:', err.message);
  }

  // 2. Mobile Homepage (390x844 @ 2x - iPhone 14)
  try {
    console.log('\n[2/9] Capturing Mobile Homepage (iPhone 14 frame)...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:3005/', { waitUntil: 'networkidle2', timeout: 25000 });
    await waitForPageReady(page, 2000);
    await page.screenshot({ path: path.join(outDir, '02-homepage-mobile.png'), type: 'png' });
    console.log('  ✓ Captured: 02-homepage-mobile.png');
  } catch (err) {
    console.error('  ✗ Error on 02-homepage-mobile:', err.message);
  }

  // Reset to Desktop Viewport
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false, hasTouch: false });

  // 3. Homepage Rooms Section (Scrolled to section 2: "Bespoke Rooms & Nomad Suites")
  try {
    console.log('\n[3/9] Capturing Homepage Rooms Section (Live API Cards)...');
    await page.goto('http://localhost:3005/', { waitUntil: 'networkidle2', timeout: 25000 });
    await waitForPageReady(page, 1500);
    await page.evaluate(() => {
      window.scrollTo({ top: 1850, behavior: 'instant' });
    });
    await sleep(2000);
    await page.screenshot({ path: path.join(outDir, '08-homepage-rooms-section-desktop.png'), type: 'png' });
    console.log('  ✓ Captured: 08-homepage-rooms-section-desktop.png');
  } catch (err) {
    console.error('  ✗ Error on 08-homepage-rooms-section:', err.message);
  }

  // 4. Property Details Hero & Gallery (/property?property_id=60765)
  try {
    console.log('\n[4/9] Capturing Property Details Hero & Gallery...');
    await page.goto('http://localhost:3005/property?property_id=60765', { waitUntil: 'networkidle2', timeout: 25000 });
    await waitForPageReady(page, 2500);
    const propDetailsPath = path.join(outDir, '04-property-details-desktop.png');
    await page.screenshot({ path: propDetailsPath, type: 'png' });
    console.log('  ✓ Captured: 04-property-details-desktop.png');
  } catch (err) {
    console.error('  ✗ Error on 04-property-details:', err.message);
  }

  // 5. Rooms Catalog Grid (/property scrolled to #availability section)
  try {
    console.log('\n[5/9] Capturing Live Rooms Catalog Grid...');
    await page.evaluate(() => {
      const avail = document.getElementById('availability');
      if (avail) {
        avail.scrollIntoView({ behavior: 'instant', block: 'start' });
      } else {
        window.scrollTo({ top: 1560, behavior: 'instant' });
      }
    });
    await sleep(2000);
    const roomsCatPath = path.join(outDir, '03-rooms-catalog-desktop.png');
    await page.screenshot({ path: roomsCatPath, type: 'png' });
    fs.copyFileSync(roomsCatPath, path.join(outDir, 'readme-property-rooms.png'));
    console.log('  ✓ Captured: 03-rooms-catalog-desktop.png & readme-property-rooms.png');
  } catch (err) {
    console.error('  ✗ Error on 03-rooms-catalog:', err.message);
  }

  // 6. Colive Duration Engine (/colive)
  try {
    console.log('\n[6/9] Capturing Colive Duration Engine & Perks...');
    await page.goto('http://localhost:3005/colive', { waitUntil: 'networkidle2', timeout: 25000 });
    await waitForPageReady(page, 2000);
    await page.evaluate(() => {
      window.scrollTo({ top: 1680, behavior: 'instant' });
    });
    await sleep(2000);
    const colivePath = path.join(outDir, '05-colive-duration-engine-desktop.png');
    await page.screenshot({ path: colivePath, type: 'png' });
    fs.copyFileSync(colivePath, path.join(outDir, 'readme-colive-engine.png'));
    console.log('  ✓ Captured: 05-colive-duration-engine-desktop.png & readme-colive-engine.png');
  } catch (err) {
    console.error('  ✗ Error on 05-colive-duration-engine:', err.message);
  }

  // 7. Community Events Bento Grid (/events)
  try {
    console.log('\n[7/9] Capturing Community Events Bento Grid...');
    await page.goto('http://localhost:3005/events', { waitUntil: 'networkidle2', timeout: 25000 });
    await waitForPageReady(page, 2000);
    await page.evaluate(() => {
      window.scrollTo({ top: 520, behavior: 'instant' });
    });
    await sleep(2000);
    const eventsPath = path.join(outDir, '06-community-events-bento-desktop.png');
    await page.screenshot({ path: eventsPath, type: 'png' });
    fs.copyFileSync(eventsPath, path.join(outDir, 'readme-events-bento.png'));
    console.log('  ✓ Captured: 06-community-events-bento-desktop.png & readme-events-bento.png');
  } catch (err) {
    console.error('  ✗ Error on 06-community-events-bento:', err.message);
  }

  // 8. Booking Checkout Review (/booking with active draft)
  try {
    console.log('\n[8/9] Capturing Booking Checkout Review (with Selected Suite & Addons)...');
    await page.goto('http://localhost:3005/', { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      const draft = {
        propertyId: '60765',
        checkinDate: '2026-10-10',
        checkoutDate: '2026-10-15',
        rooms: [
          {
            roomTypeId: 'DELUXE_STUDIO',
            slug: 'deluxe-studio',
            title: 'Deluxe Studio Suite',
            roomType: 'Private Studio',
            quantity: 1,
            basePrice: 3499,
            totalPrice: 17495,
            availableCount: 3,
            guestText: '1-2 Guests',
            image: '/images/rooms/studio.jpg',
            amenities: ['Ergonomic Workstation', '1 Gbps Wi-Fi', 'Ensuite Bath', 'AC', 'Kitchenette'],
          },
        ],
        addons: [
          {
            productId: 'fiber-boost',
            name: 'Dedicated 1 Gbps Fiber Pass',
            category: 'SERVICE',
            quantity: 1,
            unitPrice: 499,
            inStock: true,
          },
        ],
        signature: '60765::2026-10-10::2026-10-15::DELUXE_STUDIO:1::fiber-boost:1',
        createdAt: Date.now(),
        source: 'nightly',
      };

      const review = {
        signature: draft.signature,
        guest: {
          firstName: 'Arjun',
          lastName: 'Mehta',
          email: 'arjun@vibehouse.in',
          phone: '+919000000001',
          coupon: 'NOMAD10',
          acceptedTerms: true,
          additionalGuests: [],
        },
      };

      sessionStorage.setItem('vh_booking_draft', JSON.stringify({ draft, review }));
    });

    await page.goto('http://localhost:3005/booking', { waitUntil: 'networkidle2', timeout: 25000 });
    await waitForPageReady(page, 2000);
    await page.screenshot({ path: path.join(outDir, '07-booking-checkout-desktop.png'), type: 'png' });
    console.log('  ✓ Captured: 07-booking-checkout-desktop.png');
  } catch (err) {
    console.error('  ✗ Error on 07-booking-checkout:', err.message);
  }

  // 9. Partner Page (/partner-with-us)
  try {
    console.log('\n[9/9] Capturing Partner With Us Page...');
    await page.goto('http://localhost:3005/partner-with-us', { waitUntil: 'networkidle2', timeout: 25000 });
    await waitForPageReady(page, 2000);
    await page.screenshot({ path: path.join(outDir, '09-partner-upcoming-desktop.png'), type: 'png' });
    console.log('  ✓ Captured: 09-partner-upcoming-desktop.png');
  } catch (err) {
    console.error('  ✗ Error on 09-partner-upcoming:', err.message);
  }

  await browser.close();
  console.log('\n=============================================================');
  console.log('  ALL FRESH PORTFOLIO SCREENSHOTS REGENERATED (2X RETINA)');
  console.log('=============================================================\n');
}

captureAll().catch((err) => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
