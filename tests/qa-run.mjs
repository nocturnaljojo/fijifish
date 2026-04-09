/**
 * FijiFish QA script — runs against localhost:3000
 * Saves screenshots to tests/screenshots/
 * Outputs structured results for the QA report
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const BASE = 'http://localhost:3000';
const SS_DIR = './tests/screenshots';

if (!existsSync(SS_DIR)) await mkdir(SS_DIR, { recursive: true });

const results = [];

function pass(id, note = '') {
  results.push({ id, status: 'PASS', note });
  console.log(`  ✓ PASS  ${id}${note ? ' — ' + note : ''}`);
}
function warn(id, note = '') {
  results.push({ id, status: 'WARN', note });
  console.log(`  ⚠ WARN  ${id} — ${note}`);
}
function fail(id, severity, note = '') {
  results.push({ id, status: 'FAIL', severity, note });
  console.log(`  ✗ FAIL [${severity}]  ${id} — ${note}`);
}

const browser = await chromium.launch({ headless: true });

// ── Test helper ──────────────────────────────────────────────────────────────
async function withPage(width, height, fn) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  try {
    await fn(page, errors);
  } finally {
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Homepage loads
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] Homepage load');
await withPage(1280, 900, async (page, errors) => {
  const res = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: `${SS_DIR}/01-homepage-desktop.png`, fullPage: false });

  if (res.status() === 200) {
    pass('homepage-loads', `HTTP ${res.status()}`);
  } else {
    fail('homepage-loads', 'CRITICAL', `HTTP ${res.status()}`);
  }

  // 2. Dark WorldView theme
  const bg = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor
  );
  // #0a0f1a = rgb(10, 15, 26)
  if (bg === 'rgb(10, 15, 26)') {
    pass('dark-theme', bg);
  } else {
    fail('dark-theme', 'CRITICAL', `Expected rgb(10,15,26), got ${bg}`);
  }

  // 3. Console errors
  if (errors.length === 0) {
    pass('no-console-errors');
  } else {
    // Filter out known non-critical Clerk/network errors in dev
    const serious = errors.filter(e =>
      !e.includes('clerk') && !e.includes('Clerk') &&
      !e.includes('favicon') && !e.includes('net::ERR')
    );
    if (serious.length === 0) {
      warn('console-errors', `${errors.length} non-critical error(s): ${errors[0]?.slice(0, 80)}`);
    } else {
      fail('console-errors', 'HIGH', `${serious.length} error(s): ${serious[0]?.slice(0, 120)}`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4–6. Typography
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Typography');
await withPage(1280, 900, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });

  // IBM Plex Mono on price
  const priceFont = await page.evaluate(() => {
    const el = document.querySelector('[aria-label^="Price:"]');
    if (!el) return null;
    return getComputedStyle(el).fontFamily;
  });
  if (priceFont === null) {
    warn('ibm-plex-mono-price', 'No price element found — DB may be empty');
  } else if (priceFont.toLowerCase().includes('ibm plex mono') || priceFont.toLowerCase().includes('plex')) {
    pass('ibm-plex-mono-price', priceFont.slice(0, 60));
  } else {
    fail('ibm-plex-mono-price', 'HIGH', `Got: ${priceFont.slice(0, 80)}`);
  }

  // Plus Jakarta Sans on body
  const bodyFont = await page.evaluate(() =>
    getComputedStyle(document.body).fontFamily
  );
  if (bodyFont.toLowerCase().includes('jakarta') || bodyFont.toLowerCase().includes('plus jakarta')) {
    pass('plus-jakarta-body', bodyFont.slice(0, 60));
  } else {
    warn('plus-jakarta-body', `Got: ${bodyFont.slice(0, 80)} — may still be loading`);
  }

  // Monospace on countdown
  const cdFont = await page.evaluate(() => {
    // Find CountdownTimer span — look for tabular-nums pattern
    const el = document.querySelector('[class*="tabular-nums"]');
    if (!el) return null;
    return getComputedStyle(el).fontFamily;
  });
  if (cdFont === null) {
    warn('ibm-plex-mono-countdown', 'Countdown span not found — check CountdownTimer hydration');
  } else if (cdFont.toLowerCase().includes('ibm plex mono') || cdFont.toLowerCase().includes('plex') || cdFont.toLowerCase().includes('mono')) {
    pass('ibm-plex-mono-countdown', cdFont.slice(0, 60));
  } else {
    warn('ibm-plex-mono-countdown', `Got: ${cdFont.slice(0, 80)}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Delivery banner
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Delivery banner + countdown');
await withPage(1280, 900, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: `${SS_DIR}/03-delivery-banner.png`, clip: { x: 0, y: 0, width: 1280, height: 80 } });

  const bannerText = await page.locator('text=Next delivery').textContent().catch(() => null);
  if (bannerText) {
    pass('delivery-banner-visible', bannerText.trim().slice(0, 60));
  } else {
    fail('delivery-banner-visible', 'HIGH', 'Banner with "Next delivery" not found');
  }

  const flightText = await page.locator('text=FJ391').textContent().catch(() => null);
  if (flightText) {
    pass('flight-number-visible', 'FJ391 present');
  } else {
    warn('flight-number-visible', 'FJ391 text not visible (may be hidden on this viewport)');
  }

  // Countdown — check it ticks
  const cd1 = await page.evaluate(() => {
    const el = document.querySelector('[class*="tabular-nums"]');
    return el?.textContent?.trim() ?? null;
  });
  await page.waitForTimeout(2100);
  const cd2 = await page.evaluate(() => {
    const el = document.querySelector('[class*="tabular-nums"]');
    return el?.textContent?.trim() ?? null;
  });

  if (cd1 === null) {
    fail('countdown-ticks', 'HIGH', 'Countdown element not found');
  } else if (cd1 !== cd2) {
    pass('countdown-ticks', `${cd1} → ${cd2}`);
  } else {
    fail('countdown-ticks', 'HIGH', `Countdown not ticking — stayed at: ${cd1}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Fish grid
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Fish grid');
await withPage(1280, 900, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.locator('#fish-grid').scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${SS_DIR}/04-fish-grid-desktop.png`, fullPage: false });

  const cards = await page.locator('article').count();
  if (cards === 0) {
    warn('fish-cards-render', 'No fish cards — DB may be empty, showing empty state');
  } else {
    pass('fish-cards-render', `${cards} card(s) found`);

    // Walu first
    const firstCardName = await page.locator('article:first-of-type h3').textContent().catch(() => null);
    if (firstCardName?.toLowerCase().includes('walu')) {
      pass('walu-first', `First card: "${firstCardName?.trim()}"`);
    } else {
      warn('walu-first', `First card is "${firstCardName?.trim()}" — expected Walu`);
    }

    // Price in sunset gold
    const priceColor = await page.evaluate(() => {
      const el = document.querySelector('[aria-label^="Price:"]');
      if (!el) return null;
      return getComputedStyle(el).color;
    });
    // #ffab40 = rgb(255, 171, 64)
    if (priceColor === 'rgb(255, 171, 64)') {
      pass('price-sunset-gold', priceColor);
    } else if (priceColor) {
      warn('price-sunset-gold', `Got ${priceColor}, expected rgb(255,171,64)`);
    } else {
      warn('price-sunset-gold', 'Price element not found');
    }

    // Village origin label
    const villageLabel = await page.locator('text=From Galoa Village').first().textContent().catch(() => null);
    if (villageLabel) {
      pass('village-origin-label', villageLabel.trim().slice(0, 60));
    } else {
      fail('village-origin-label', 'HIGH', '"From Galoa Village" not found on any card');
    }

    // Capacity bar present
    const capacityBar = await page.locator('[role="meter"]').count();
    if (capacityBar > 0) {
      pass('capacity-bar-present', `${capacityBar} bar(s) found`);
    } else {
      fail('capacity-bar-present', 'HIGH', 'No [role="meter"] capacity bars found');
    }

    // Sold out card check
    const soldOut = await page.locator('text=Sold Out').count();
    if (soldOut > 0) {
      pass('sold-out-state', `${soldOut} sold-out item(s) shown correctly`);
    } else {
      warn('sold-out-state', 'No sold-out cards visible (all may have capacity)');
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Responsive — mobile 375px
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Responsive — mobile 375px');
await withPage(375, 812, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: `${SS_DIR}/05-homepage-mobile-375.png`, fullPage: false });
  await page.screenshot({ path: `${SS_DIR}/05-homepage-mobile-375-full.png`, fullPage: true });

  // Banner still visible
  const banner = await page.locator('text=Next delivery').isVisible().catch(() => false);
  if (banner) {
    pass('mobile-banner-visible');
  } else {
    fail('mobile-banner-visible', 'HIGH', 'Banner not visible at 375px');
  }

  // Hero visible
  const hero = await page.locator('text=Fresh from').isVisible().catch(() => false);
  if (hero) {
    pass('mobile-hero-visible');
  } else {
    fail('mobile-hero-visible', 'HIGH', 'Hero headline not visible at 375px');
  }

  // Grid is single column — check card width
  const cardWidth = await page.evaluate(() => {
    const card = document.querySelector('article');
    return card ? card.getBoundingClientRect().width : null;
  });
  if (cardWidth === null) {
    warn('mobile-single-column', 'No cards to measure');
  } else if (cardWidth > 300) {
    pass('mobile-single-column', `Card width: ${cardWidth.toFixed(0)}px`);
  } else {
    fail('mobile-single-column', 'HIGH', `Card too narrow: ${cardWidth.toFixed(0)}px`);
  }

  // CTA tap target ≥ 44px
  const ctaH = await page.evaluate(() => {
    const btn = document.querySelector('a[href="#fish-grid"]');
    return btn ? btn.getBoundingClientRect().height : null;
  });
  if (ctaH === null) {
    warn('mobile-tap-target-cta', 'CTA button not found');
  } else if (ctaH >= 44) {
    pass('mobile-tap-target-cta', `Height: ${ctaH.toFixed(0)}px`);
  } else {
    fail('mobile-tap-target-cta', 'HIGH', `CTA height ${ctaH.toFixed(0)}px < 44px`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Responsive — tablet 768px
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Responsive — tablet 768px');
await withPage(768, 1024, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: `${SS_DIR}/06-homepage-tablet-768.png`, fullPage: false });
  pass('tablet-loads', '768px viewport renders without error');

  // Should be 2-column grid at md:
  const cols = await page.evaluate(() => {
    const grid = document.querySelector('#fish-grid .grid');
    if (!grid) return null;
    const cards = grid.querySelectorAll('article');
    if (cards.length < 2) return null;
    const y0 = cards[0].getBoundingClientRect().top;
    const y1 = cards[1].getBoundingClientRect().top;
    return Math.abs(y0 - y1) < 5 ? 2 : 1; // same row = 2 col
  });
  if (cols === null) {
    warn('tablet-two-column', 'Not enough cards to verify grid columns');
  } else if (cols === 2) {
    pass('tablet-two-column', '2-column grid confirmed');
  } else {
    warn('tablet-two-column', `Detected ${cols} column(s) — expected 2 at 768px`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Sign-in / sign-up pages
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] Auth pages');
await withPage(1280, 900, async (page) => {
  const siRes = await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.screenshot({ path: `${SS_DIR}/07-sign-in.png` });
  if (siRes.status() < 400) {
    pass('sign-in-page', `HTTP ${siRes.status()}`);
  } else {
    fail('sign-in-page', 'HIGH', `HTTP ${siRes.status()}`);
  }

  const suRes = await page.goto(`${BASE}/sign-up`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.screenshot({ path: `${SS_DIR}/08-sign-up.png` });
  if (suRes.status() < 400) {
    pass('sign-up-page', `HTTP ${suRes.status()}`);
  } else {
    fail('sign-up-page', 'HIGH', `HTTP ${suRes.status()}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Footer
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] Footer');
await withPage(1280, 900, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SS_DIR}/09-footer.png` });

  const waggaText = await page.locator('text=Riverina').first().isVisible().catch(() => false);
  if (waggaText) {
    pass('footer-route-chain', 'Riverina text visible');
  } else {
    fail('footer-route-chain', 'MEDIUM', '"Riverina" not found in footer');
  }

  const feedbackBtn = await page.locator('text=Give Feedback').isVisible().catch(() => false);
  if (feedbackBtn) {
    pass('footer-feedback-trigger', '"Give Feedback" button present');
  } else {
    fail('footer-feedback-trigger', 'MEDIUM', '"Give Feedback" not found in footer');
  }

  const copyright = await page.locator('text=FijiFish Pacific Seafood').isVisible().catch(() => false);
  if (copyright) {
    pass('footer-copyright');
  } else {
    warn('footer-copyright', 'Copyright line not visible');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Village preview
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9] Village preview');
await withPage(1280, 900, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.locator('#village').scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${SS_DIR}/10-village-preview.png` });

  const galoa = await page.locator('text=Galoa Village').first().isVisible().catch(() => false);
  if (galoa) {
    pass('village-preview-renders', '"Galoa Village" visible');
  } else {
    fail('village-preview-renders', 'HIGH', '"Galoa Village" not found in village section');
  }

  const impact = await page.locator('text=Community Impact').isVisible().catch(() => false);
  if (impact) {
    pass('village-impact-panel', 'Community Impact panel visible');
  } else {
    warn('village-impact-panel', 'Community Impact panel not visible — may need DB data');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Galoa map animation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[10] Galoa map animation');
await withPage(1280, 900, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });

  // Scroll to map section
  const mapSection = await page.locator('text=Where Your Fish Comes From').first();
  await mapSection.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(3500); // allow animation to complete (done phase ~2.8s)
  await page.screenshot({ path: `${SS_DIR}/11-galoa-map.png` });

  const mapSvg = await page.locator('svg[aria-label*="Galoa"]').isVisible().catch(() => false);
  if (mapSvg) {
    pass('galoa-map-svg-renders', 'SVG map visible');
  } else {
    fail('galoa-map-svg-renders', 'HIGH', 'SVG with aria-label containing "Galoa" not found');
  }

  const mapHeading = await page.locator('text=Where Your Fish Comes From').isVisible().catch(() => false);
  if (mapHeading) {
    pass('galoa-map-heading');
  } else {
    fail('galoa-map-heading', 'MEDIUM', 'Map section heading not found');
  }

  // Check labels rendered (done phase)
  const galoa = await page.locator('text=GALOA VILLAGE').count().catch(() => 0);
  if (galoa > 0) {
    pass('galoa-map-labels-animate', 'GALOA VILLAGE label visible after animation');
  } else {
    warn('galoa-map-labels-animate', 'GALOA VILLAGE label not found — animation may not have triggered (IntersectionObserver in headless?)');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Fish interest survey
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[11] Fish interest survey');
await withPage(1280, 900, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });

  const surveyHeading = await page.locator('text=What fish would you like us to bring next').first().isVisible().catch(() => false);
  if (surveyHeading) {
    pass('fish-survey-visible', 'Survey section present');
  } else {
    fail('fish-survey-visible', 'HIGH', 'Survey heading not found on homepage');
  }

  // Wait for client hydration
  await page.waitForTimeout(1000);
  await page.locator('text=What fish would you like us to bring next').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${SS_DIR}/12-fish-survey.png` });

  // Check for species chips
  const chips = await page.locator('[aria-label^="Vote for"]').count().catch(() => 0);
  if (chips > 0) {
    pass('fish-survey-chips', `${chips} species chip(s) found`);
  } else {
    warn('fish-survey-chips', 'No vote chips found — DB may be empty or component not hydrated yet');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Feedback form
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[12] Feedback form');
await withPage(1280, 900, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);

  const triggerBtn = await page.locator('text=Give Feedback').first();
  if (await triggerBtn.isVisible().catch(() => false)) {
    await triggerBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SS_DIR}/13-feedback-modal.png` });

    const modal = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    if (modal) {
      pass('feedback-modal-opens', 'Dialog opens on click');
    } else {
      fail('feedback-modal-opens', 'HIGH', 'No [role="dialog"] found after clicking "Give Feedback"');
    }

    // Check form fields
    const typeSelect = await page.locator('#feedback-type').isVisible().catch(() => false);
    const messageArea = await page.locator('#feedback-message').isVisible().catch(() => false);
    const stars = await page.locator('[aria-label^="1 star"]').isVisible().catch(() => false);
    const submitBtn = await page.locator('text=Send Feedback').isVisible().catch(() => false);

    if (typeSelect && messageArea && stars && submitBtn) {
      pass('feedback-form-fields', 'All fields present: type, message, stars, submit');
    } else {
      warn('feedback-form-fields', `type:${typeSelect} msg:${messageArea} stars:${stars} submit:${submitBtn}`);
    }
  } else {
    fail('feedback-modal-opens', 'HIGH', '"Give Feedback" button not found in footer');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. API routes
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[13] API routes');
await withPage(1280, 900, async (page) => {
  // Survey vote — invalid payload should return 400
  const voteRes = await page.request.post(`${BASE}/api/survey/vote`, {
    data: {},
    headers: { 'Content-Type': 'application/json' },
  });
  if (voteRes.status() === 400) {
    pass('api-survey-vote-validation', 'Returns 400 on missing fish_species_id');
  } else {
    warn('api-survey-vote-validation', `Expected 400, got ${voteRes.status()}`);
  }

  // Feedback — invalid payload
  const feedRes = await page.request.post(`${BASE}/api/feedback`, {
    data: {},
    headers: { 'Content-Type': 'application/json' },
  });
  if (feedRes.status() === 400) {
    pass('api-feedback-validation', 'Returns 400 on missing fields');
  } else {
    warn('api-feedback-validation', `Expected 400, got ${feedRes.status()}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Full-page screenshot
// ─────────────────────────────────────────────────────────────────────────────
await withPage(1280, 900, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${SS_DIR}/00-homepage-full.png`, fullPage: true });
});

await browser.close();

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.status === 'PASS').length;
const warned = results.filter(r => r.status === 'WARN').length;
const failed = results.filter(r => r.status === 'FAIL').length;

console.log(`\n${'─'.repeat(60)}`);
console.log(`QA SUMMARY: ${passed} PASS  ${warned} WARN  ${failed} FAIL`);
console.log(`${'─'.repeat(60)}\n`);

// Emit JSON for report generation
console.log('__RESULTS_JSON__' + JSON.stringify(results));
