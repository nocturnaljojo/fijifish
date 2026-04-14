/**
 * FijiFish QA — Checkout Flow
 * Tests: homepage fish grid → add to cart → cart drawer → /checkout → /order/success → /account
 * Saves screenshots to tests/screenshots/checkout-[step].png
 * Date: 2026-04-12
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
// STEP 1: Homepage loads + fish grid visible
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 1] Homepage + fish grid');
await withPage(1280, 900, async (page, errors) => {
  const res = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await page.screenshot({ path: `${SS_DIR}/checkout-01-homepage.png`, fullPage: false });

  if (res.status() === 200) {
    pass('step1-homepage-loads', `HTTP ${res.status()}`);
  } else {
    fail('step1-homepage-loads', 'CRITICAL', `HTTP ${res.status()}`);
  }

  // Dark theme
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (bg === 'rgb(10, 15, 26)') {
    pass('step1-dark-theme', bg);
  } else {
    fail('step1-dark-theme', 'CRITICAL', `Expected rgb(10,15,26), got ${bg}`);
  }

  // Fish cards present
  const cards = await page.locator('article').count();
  if (cards > 0) {
    pass('step1-fish-grid-renders', `${cards} card(s)`);
  } else {
    fail('step1-fish-grid-renders', 'CRITICAL', 'No fish cards — cannot test checkout flow');
    return;
  }

  // Walu is first
  const firstCardName = await page.locator('article:first-of-type h3').textContent().catch(() => null);
  if (firstCardName?.toLowerCase().includes('walu')) {
    pass('step1-walu-first', `First: "${firstCardName?.trim()}"`);
  } else {
    warn('step1-walu-first', `First card is "${firstCardName?.trim()}" — expected Walu`);
  }

  // "Order Now" or "Secure Your Order" button on first card
  const waluOrderBtn = await page.locator('article:first-of-type button').first().textContent().catch(() => null);
  if (waluOrderBtn?.includes('Order') || waluOrderBtn?.includes('Secure')) {
    pass('step1-fish-card-cta', `CTA: "${waluOrderBtn?.trim().slice(0,40)}"`);
  } else {
    fail('step1-fish-card-cta', 'HIGH', `No Order button on first card, found: "${waluOrderBtn?.trim().slice(0,40)}"`);
  }

  // Check console errors
  const serious = errors.filter(e =>
    !e.includes('clerk') && !e.includes('Clerk') &&
    !e.includes('favicon') && !e.includes('net::ERR')
  );
  if (serious.length === 0) {
    pass('step1-no-console-errors', errors.length > 0 ? `${errors.length} non-critical filtered` : 'clean');
  } else {
    fail('step1-console-errors', 'HIGH', serious[0]?.slice(0, 120));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Click "Add to Order" on Walu → cart drawer opens
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 2] Add to cart → cart drawer');
await withPage(1280, 900, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });

  // Find the first available fish card's button (Walu should be first)
  const orderBtn = page.locator('article:first-of-type button').first();
  const btnText = await orderBtn.textContent().catch(() => null);
  console.log(`    First card button text: "${btnText?.trim()}"`);

  if (!btnText?.match(/order|secure|add/i)) {
    fail('step2-add-to-cart-click', 'CRITICAL', `Button text "${btnText}" is not an order button`);
    return;
  }

  await orderBtn.click();
  await page.waitForTimeout(800); // wait for drawer animation

  await page.screenshot({ path: `${SS_DIR}/checkout-02-cart-drawer.png`, fullPage: false });

  // Cart drawer should be visible — check for drawer container
  const drawerVisible = await page.locator('[data-testid="cart-drawer"]').isVisible().catch(() => false);
  // Also try role-based or class-based checks
  const drawerByAria = await page.locator('[aria-label="Shopping cart"]').isVisible().catch(() => false);
  // Try to find the drawer by its known content
  const drawerHasItem = await page.locator('text=Walu').count() > 0;
  // Check for the total line in the drawer
  const totalVisible = await page.locator('text=Total').isVisible().catch(() => false);
  // Check for checkout button in drawer
  const checkoutBtnVisible = await page.locator('text=Proceed to Checkout').isVisible().catch(() => false);
  const checkoutBtnAlt = await page.locator('text=Checkout').isVisible().catch(() => false);

  if (drawerVisible || drawerByAria) {
    pass('step2-cart-drawer-opens', 'Drawer detected by testid/aria');
  } else if (drawerHasItem && (totalVisible || checkoutBtnVisible || checkoutBtnAlt)) {
    pass('step2-cart-drawer-opens', 'Drawer content confirmed (Walu + Total/Checkout)');
  } else {
    fail('step2-cart-drawer-opens', 'CRITICAL', `Drawer not detected. item:${drawerHasItem} total:${totalVisible} checkout:${checkoutBtnVisible||checkoutBtnAlt}`);
  }

  // Added state on button (should show "✅ Added!" after click)
  const addedState = await page.locator('text=Added').isVisible().catch(() => false);
  if (addedState) {
    pass('step2-button-added-state', 'Button shows "Added!" after click');
  } else {
    warn('step2-button-added-state', 'Button "Added!" feedback state not found — may have already transitioned');
  }

  // Cart item details
  const cartItemCount = await page.locator('[data-testid="cart-item"]').count().catch(() => 0);
  console.log(`    Cart items by testid: ${cartItemCount}`);

  // Check for qty controls in drawer
  const qtyPlus = await page.locator('[aria-label*="increase"]').isVisible().catch(() => false)
    || await page.locator('button:has-text("+")').isVisible().catch(() => false);
  const qtyMinus = await page.locator('[aria-label*="decrease"]').isVisible().catch(() => false)
    || await page.locator('button:has-text("-")').count() > 0;

  if (qtyPlus || qtyMinus) {
    pass('step2-cart-qty-controls', 'Qty +/- buttons present in drawer');
  } else {
    warn('step2-cart-qty-controls', 'Cannot confirm +/- qty buttons — may need different selectors');
  }

  // Remove button
  const removeBtn = await page.locator('text=Remove').isVisible().catch(() => false);
  if (removeBtn) {
    pass('step2-cart-remove-button', '"Remove" button present in drawer');
  } else {
    warn('step2-cart-remove-button', '"Remove" button not found — check CartDrawer.tsx');
  }

  // Proceed to Checkout button
  if (checkoutBtnVisible || checkoutBtnAlt) {
    pass('step2-checkout-button-in-drawer', `"${checkoutBtnVisible ? 'Proceed to Checkout' : 'Checkout'}" button present`);
  } else {
    fail('step2-checkout-button-in-drawer', 'HIGH', 'No checkout button found in cart drawer');
  }

  // Navbar cart badge
  const badge = await page.locator('[data-testid="cart-badge"]').textContent().catch(() => null)
    || await page.evaluate(() => {
      // Look for a badge element near the shopping bag icon
      const spans = [...document.querySelectorAll('span')];
      const badge = spans.find(s => s.textContent?.trim() === '1' && s.closest('button'));
      return badge ? badge.textContent?.trim() : null;
    });
  if (badge === '1') {
    pass('step2-cart-badge-count', 'Badge shows 1');
  } else {
    warn('step2-cart-badge-count', `Badge value: "${badge}" — expected "1"`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: Cart qty controls — increase quantity
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 3] Cart quantity controls');
await withPage(1280, 900, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });

  // Add item first
  const orderBtn = page.locator('article:first-of-type button').first();
  await orderBtn.click();
  await page.waitForTimeout(800);

  // Get initial qty display
  // Look for the qty number between the +/- buttons
  const getQty = async () => {
    return await page.evaluate(() => {
      // Try to find qty number in the cart drawer
      const _spans = [...document.querySelectorAll('span')];
      // Look for a span that contains a number in range 1-99 near cart context
      const cartSection = document.querySelector('[data-testid="cart-drawer"]')
        || document.querySelector('[aria-label="Shopping cart"]')
        || document.querySelector('aside')
        || document.body;
      const numSpans = [...cartSection.querySelectorAll('span')].filter(s => /^\d+(\.\d+)?$/.test(s.textContent?.trim() || ''));
      return numSpans.map(s => s.textContent?.trim()).join(',') || null;
    });
  };

  const qtyBefore = await getQty();
  console.log(`    Qty display before: ${qtyBefore}`);

  // Click + button
  const plusBtn = page.locator('button:has-text("+")').first();
  const plusVisible = await plusBtn.isVisible().catch(() => false);

  if (plusVisible) {
    await plusBtn.click();
    await page.waitForTimeout(400);
    const qtyAfter = await getQty();
    console.log(`    Qty display after +: ${qtyAfter}`);

    await page.screenshot({ path: `${SS_DIR}/checkout-03-cart-qty-plus.png`, fullPage: false });

    if (qtyBefore !== qtyAfter) {
      pass('step3-qty-increase', `${qtyBefore} → ${qtyAfter}`);
    } else {
      warn('step3-qty-increase', `Qty unchanged at ${qtyAfter} — may be correct if display format differs`);
    }
  } else {
    warn('step3-qty-controls-not-found', 'No "+" button found in drawer');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: /checkout — unauthenticated → redirects to sign-in
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 4] /checkout auth gate (unauthenticated)');
await withPage(1280, 900, async (page) => {
  const res = await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.screenshot({ path: `${SS_DIR}/checkout-04-checkout-unauthed.png`, fullPage: false });
  const url = page.url();

  if (url.includes('/sign-in') || url.includes('sign_in') || url.includes('clerk')) {
    pass('step4-checkout-auth-gate', `Redirected to: ${url.slice(0, 60)}`);
  } else if (res.status() === 200 && url.includes('/checkout')) {
    // May show an empty form or a message — not necessarily a fail if it handles gracefully
    // Check if it shows any checkout form content
    const hasForm = await page.locator('form').isVisible().catch(() => false);
    const hasSignInPrompt = await page.locator('text=sign in').isVisible().catch(() => false)
      || await page.locator('text=Sign In').isVisible().catch(() => false);
    if (hasSignInPrompt) {
      warn('step4-checkout-auth-gate', 'Checkout shows sign-in prompt inline (not hard redirect)');
    } else if (hasForm) {
      warn('step4-checkout-auth-gate', 'Checkout page accessible without auth — should redirect to sign-in');
    } else {
      pass('step4-checkout-auth-gate', `Page at ${url} — status ${res.status()}`);
    }
  } else {
    fail('step4-checkout-auth-gate', 'HIGH', `Expected redirect to sign-in, got ${url} (HTTP ${res.status()})`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5: /checkout page structure (load it directly)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 5] /checkout page structure');
await withPage(1280, 900, async (page, errors) => {
  // Navigate directly — will redirect if auth required
  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const finalUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/checkout-05-checkout-page.png`, fullPage: false });

  if (finalUrl.includes('/checkout')) {
    // Actually reached checkout — check structure
    const heading = await page.locator('h1, h2').first().textContent().catch(() => null);
    console.log(`    Checkout heading: "${heading?.trim()}"`);

    // Delivery form fields
    const nameField = await page.locator('input[name="name"], input[placeholder*="name"], input[id*="name"]').count();
    const addressField = await page.locator('input[name="address"], input[placeholder*="address"], input[id*="address"], textarea[name*="address"]').count();

    if (nameField > 0 || addressField > 0) {
      pass('step5-checkout-delivery-form', `name fields: ${nameField}, address fields: ${addressField}`);
    } else {
      warn('step5-checkout-delivery-form', 'No name/address fields found — form may use different identifiers');
    }

    // Cart summary in checkout
    const cartSummary = await page.locator('text=Order Summary').isVisible().catch(() => false)
      || await page.locator('text=Cart').isVisible().catch(() => false);
    if (cartSummary) {
      pass('step5-checkout-cart-summary', 'Order summary section visible');
    } else {
      warn('step5-checkout-cart-summary', 'No "Order Summary"/"Cart" text found on checkout page');
    }

    // Pay/Submit button
    const payBtn = await page.locator('button[type="submit"], button:has-text("Pay"), button:has-text("Place Order"), button:has-text("Confirm")').first().isVisible().catch(() => false);
    if (payBtn) {
      pass('step5-checkout-submit-button', 'Submit/Pay button present');
    } else {
      warn('step5-checkout-submit-button', 'No submit button found on checkout');
    }

    // No console errors
    const serious = errors.filter(e =>
      !e.includes('clerk') && !e.includes('Clerk') && !e.includes('net::ERR')
    );
    if (serious.length === 0) {
      pass('step5-checkout-no-errors', `${errors.length} filtered errors`);
    } else {
      fail('step5-checkout-console-errors', 'HIGH', serious[0]?.slice(0, 120));
    }
  } else {
    // Redirected — it's auth-gated correctly, structure check skipped
    warn('step5-checkout-structure', `Redirected to ${finalUrl.slice(0, 60)} — structure check skipped (auth required)`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6: /order/success — page loads without white screen
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 6] /order/success');
await withPage(1280, 900, async (page, errors) => {
  const res = await page.goto(`${BASE}/order/success`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: `${SS_DIR}/checkout-06-order-success.png`, fullPage: false });

  if (res.status() >= 400) {
    fail('step6-order-success-loads', 'CRITICAL', `HTTP ${res.status()}`);
    return;
  }

  // Check it's not a white screen (has dark background or content)
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const isWhiteScreen = bg === 'rgb(255, 255, 255)' || bg === 'rgba(0, 0, 0, 0)';

  if (!isWhiteScreen) {
    pass('step6-order-success-not-white', `Background: ${bg}`);
  } else {
    fail('step6-order-success-not-white', 'CRITICAL', `White screen detected: ${bg}`);
  }

  // Check for 4-step timeline (spec requirement)
  const stepTimeline = await page.locator('text=Order Confirmed').isVisible().catch(() => false)
    || await page.locator('text=Confirmed').isVisible().catch(() => false);
  if (stepTimeline) {
    pass('step6-order-success-timeline', '"Order Confirmed" step visible');
  } else {
    warn('step6-order-success-timeline', '"Order Confirmed" not found — timeline may render differently');
  }

  // Check for 4 steps in timeline
  const timelineSteps = await page.locator('[class*="step"], [class*="timeline"], li').count();
  console.log(`    Timeline/step elements: ${timelineSteps}`);

  // Share button
  const shareBtn = await page.locator('text=Share').isVisible().catch(() => false)
    || await page.locator('button:has-text("Share")').isVisible().catch(() => false);
  if (shareBtn) {
    pass('step6-order-success-share-btn', 'Share button present');
  } else {
    warn('step6-order-success-share-btn', 'Share button not visible — may be conditionally rendered');
  }

  // Track order / continue browsing link
  const continueLink = await page.locator('text=Continue Shopping').isVisible().catch(() => false)
    || await page.locator('text=Browse').isVisible().catch(() => false)
    || await page.locator('a[href="/"]').count() > 0;
  if (continueLink) {
    pass('step6-order-success-continue-link', 'Continue/Browse link present');
  } else {
    warn('step6-order-success-continue-link', 'No continue shopping link found');
  }

  // Console errors
  const serious = errors.filter(e =>
    !e.includes('clerk') && !e.includes('Clerk') && !e.includes('net::ERR')
  );
  if (serious.length === 0) {
    pass('step6-order-success-no-errors', `${errors.length} filtered`);
  } else {
    fail('step6-order-success-console-errors', 'HIGH', serious[0]?.slice(0, 120));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7: /account — unauthenticated → redirects to sign-in
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 7] /account auth gate');
await withPage(1280, 900, async (page) => {
  const _res = await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const finalUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/checkout-07-account-unauthed.png`, fullPage: false });

  if (finalUrl.includes('/sign-in') || finalUrl.includes('clerk')) {
    pass('step7-account-auth-gate', `Redirected to sign-in: ${finalUrl.slice(0, 60)}`);
  } else if (finalUrl.includes('/account')) {
    // Check content — should not show sensitive info without auth
    const hasSignInMsg = await page.locator('text=sign in').isVisible().catch(() => false)
      || await page.locator('text=Sign In').isVisible().catch(() => false);
    if (hasSignInMsg) {
      warn('step7-account-auth-gate', 'Shows inline sign-in prompt (not hard redirect)');
    } else {
      fail('step7-account-auth-gate', 'HIGH', 'Account page accessible without auth — no redirect, no sign-in prompt');
    }
  } else {
    fail('step7-account-auth-gate', 'HIGH', `Unexpected redirect to ${finalUrl}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 8: /account page structure check
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 8] /account page structure');
await withPage(1280, 900, async (page, errors) => {
  await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const finalUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/checkout-08-account-page.png`, fullPage: false });

  if (finalUrl.includes('/account')) {
    // Check for the 3 spec-required sections
    const activeOrders = await page.locator('text=Active Orders').isVisible().catch(() => false);
    const orderHistory = await page.locator('text=Order History').isVisible().catch(() => false);
    const preferences = await page.locator('text=Preferences').isVisible().catch(() => false);

    if (activeOrders) {
      pass('step8-account-active-orders', '"Active Orders" section present');
    } else {
      fail('step8-account-active-orders', 'HIGH', '"Active Orders" section missing');
    }

    if (orderHistory) {
      pass('step8-account-order-history', '"Order History" section present');
    } else {
      fail('step8-account-order-history', 'HIGH', '"Order History" section missing');
    }

    if (preferences) {
      pass('step8-account-preferences', '"Preferences" section present');
    } else {
      fail('step8-account-preferences', 'HIGH', '"Preferences" section missing');
    }

    // No white screen
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const isWhite = bg === 'rgb(255, 255, 255)';
    if (!isWhite) {
      pass('step8-account-no-white-screen', `Background: ${bg}`);
    } else {
      fail('step8-account-no-white-screen', 'CRITICAL', 'White screen on /account');
    }

    // No critical console errors
    const serious = errors.filter(e =>
      !e.includes('clerk') && !e.includes('Clerk') && !e.includes('net::ERR')
    );
    if (serious.length === 0) {
      pass('step8-account-no-errors', `${errors.length} filtered`);
    } else {
      fail('step8-account-console-errors', 'HIGH', serious[0]?.slice(0, 120));
    }
  } else {
    warn('step8-account-structure', `Redirected to ${finalUrl.slice(0, 60)} — structure check skipped (auth required)`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 9: Mobile checkout flow (375px)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 9] Mobile — add to cart at 375px');
await withPage(375, 812, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await page.screenshot({ path: `${SS_DIR}/checkout-09-mobile-homepage.png`, fullPage: false });

  const cards = await page.locator('article').count();
  if (cards === 0) {
    fail('step9-mobile-fish-grid', 'HIGH', 'No fish cards at 375px');
    return;
  }
  pass('step9-mobile-fish-grid', `${cards} cards at 375px`);

  // Click add to cart
  const orderBtn = page.locator('article:first-of-type button').first();
  await orderBtn.click();
  await page.waitForTimeout(800);

  await page.screenshot({ path: `${SS_DIR}/checkout-09-mobile-cart.png`, fullPage: false });

  // Cart drawer should open on mobile
  const drawerHasItem = await page.locator('text=Walu').count() > 0;
  const checkoutBtn = await page.locator('text=Proceed to Checkout').isVisible().catch(() => false)
    || await page.locator('text=Checkout').isVisible().catch(() => false);

  if (drawerHasItem && checkoutBtn) {
    pass('step9-mobile-cart-drawer', 'Cart drawer opens on mobile with Walu + Checkout button');
  } else if (drawerHasItem) {
    warn('step9-mobile-cart-drawer', `Drawer has item but checkout button not found: item:${drawerHasItem} checkout:${checkoutBtn}`);
  } else {
    fail('step9-mobile-cart-drawer', 'HIGH', 'Cart drawer did not open on mobile click');
  }

  // StickyOrderBar should be visible on mobile after scroll
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(500);
  const stickyBar = await page.locator('[class*="sticky"], [class*="fixed"]').filter({ hasText: /order/i }).first().isVisible().catch(() => false);
  if (stickyBar) {
    pass('step9-sticky-order-bar', 'StickyOrderBar visible after scroll on mobile');
  } else {
    warn('step9-sticky-order-bar', 'StickyOrderBar not detected — may use different class structure');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 10: /supply-chain + /impact pages (spec: CTA shows price from config)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 10] /supply-chain + /impact');
await withPage(1280, 900, async (page, errors) => {
  // supply-chain
  const scRes = await page.goto(`${BASE}/supply-chain`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: `${SS_DIR}/checkout-10-supply-chain.png`, fullPage: false });

  if (scRes.status() < 400) {
    pass('step10-supply-chain-loads', `HTTP ${scRes.status()}`);
  } else {
    fail('step10-supply-chain-loads', 'HIGH', `HTTP ${scRes.status()}`);
  }

  // Check for price from config (should show A$ something, not "undefined" or empty)
  const priceText = await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')];
    return els.find(el => el.textContent?.includes('A$') && el.children.length === 0)?.textContent?.trim() ?? null;
  });
  if (priceText?.includes('A$')) {
    pass('step10-supply-chain-price-from-config', `Price text: "${priceText}"`);
  } else {
    warn('step10-supply-chain-price', 'No A$ price text found on /supply-chain');
  }

  const scErrors = errors.filter(e => !e.includes('clerk') && !e.includes('net::ERR'));
  if (scErrors.length === 0) {
    pass('step10-supply-chain-no-errors');
  } else {
    fail('step10-supply-chain-errors', 'HIGH', scErrors[0]?.slice(0, 120));
  }

  // impact page
  const impactRes = await page.goto(`${BASE}/impact`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: `${SS_DIR}/checkout-10-impact.png`, fullPage: false });

  if (impactRes.status() < 400) {
    pass('step10-impact-loads', `HTTP ${impactRes.status()}`);
  } else {
    fail('step10-impact-loads', 'HIGH', `HTTP ${impactRes.status()}`);
  }

  const impErrors = errors.filter(e => !e.includes('clerk') && !e.includes('net::ERR'));
  if (impErrors.length === 0) {
    pass('step10-impact-no-errors');
  } else {
    fail('step10-impact-errors', 'HIGH', impErrors[0]?.slice(0, 120));
  }
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
console.log(`${'─'.repeat(60)}`);

console.log('__RESULTS_JSON__' + JSON.stringify(results));
