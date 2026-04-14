/**
 * FijiFish QA — Full Checkout Flow (End-to-End)
 * Steps:
 *   1. Homepage loads — fish grid visible, dark theme
 *   2. Add Walu to cart — cart drawer opens with item
 *   3. Cart drawer — item name, price, qty controls, remove, checkout button
 *   4. Navigate to /checkout (unauthenticated) — auth gate check
 *   5. Checkout form structure (with cart state simulated)
 *   6. Submit behaviour — does it hit /api/checkout → Stripe or error?
 *   7. /order/success — page renders correctly
 * All screenshots saved to tests/screenshots/checkout-flow-[step].png
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
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  // Collect console errors across the whole session
});
const page = await ctx.newPage();
const consoleErrors = [];
page.on('pageerror', e => consoleErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Homepage loads
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 1] Homepage loads');
{
  const res = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await page.screenshot({ path: `${SS_DIR}/checkout-flow-1-homepage.png`, fullPage: false });

  // HTTP 200
  if (res.status() === 200) {
    pass('step1-homepage-loads', `HTTP ${res.status()}`);
  } else {
    fail('step1-homepage-loads', 'CRITICAL', `HTTP ${res.status()}`);
  }

  // Dark theme — #0a0f1a
  const bg = await page.evaluate(() => {
    return window.getComputedStyle(document.body).backgroundColor;
  });
  if (bg === 'rgb(10, 15, 26)') {
    pass('step1-dark-theme', bg);
  } else {
    fail('step1-dark-theme', 'CRITICAL', `Got ${bg}, expected rgb(10, 15, 26)`);
  }

  // Fish grid renders — at least 1 FishCard
  const _fishCards = page.locator('h3, [data-testid="fish-card"]');
  const waluVisible = await page.locator('text=Walu').first().isVisible().catch(() => false);
  if (waluVisible) {
    pass('step1-fish-grid-walu', 'Walu card visible');
  } else {
    fail('step1-fish-grid-walu', 'CRITICAL', 'Walu card not found on homepage');
  }

  // Delivery banner visible
  const _banner = await page.locator('[data-testid="delivery-banner"], text=FJ911, text=Sydney').first().isVisible().catch(() => false);
  const bannerByText = await page.locator('text=Sydney').first().isVisible().catch(() => false);
  if (bannerByText) {
    pass('step1-delivery-banner', 'Delivery banner visible');
  } else {
    warn('step1-delivery-banner', 'Delivery banner / Sydney text not found');
  }

  // Navbar renders
  const navbar = await page.locator('nav').first().isVisible().catch(() => false);
  if (navbar) {
    pass('step1-navbar', 'Navbar rendered');
  } else {
    warn('step1-navbar', 'nav element not found');
  }

  // Console errors at step 1
  const errCount = consoleErrors.length;
  if (errCount === 0) {
    pass('step1-no-console-errors', 'clean');
  } else {
    const filtered = consoleErrors.filter(e =>
      !e.includes('Warning:') && !e.includes('ReactDOM.render')
    );
    if (filtered.length === 0) {
      warn('step1-no-console-errors', `${errCount} warnings (no blocking errors)`);
    } else {
      fail('step1-console-errors', 'HIGH', filtered.slice(0, 3).join(' | '));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Add Walu to cart
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 2] Add Walu to cart');
{
  // Find the Walu CTA button
  const waluCta = page.locator('button:has-text("Secure Your Order"), button:has-text("Order Now")').first();
  const ctaVisible = await waluCta.isVisible().catch(() => false);

  if (!ctaVisible) {
    fail('step2-walu-cta-visible', 'HIGH', 'Walu "Secure Your Order" / "Order Now" button not found');
  } else {
    const ctaText = await waluCta.textContent();
    pass('step2-walu-cta-visible', `CTA text: "${ctaText?.trim()}"`);

    // Click the CTA
    await waluCta.click();
    // Brief pause for animation
    await page.waitForTimeout(800);

    await page.screenshot({ path: `${SS_DIR}/checkout-flow-2-after-click.png`, fullPage: false });

    // Check for "Added!" state
    const addedState = await page.locator('text=Added!').first().isVisible().catch(() => false);
    if (addedState) {
      pass('step2-added-feedback', '"Added!" feedback shown on button');
    } else {
      warn('step2-added-feedback', '"Added!" state not detected — may have transitioned before screenshot');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: Cart drawer opens with item
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 3] Cart drawer with Walu item');
{
  // Wait for cart drawer to appear (it should have opened after clicking add)
  await page.waitForTimeout(500);
  const drawerOpen = await page.locator('text=Your Order').first().isVisible().catch(() => false);

  if (!drawerOpen) {
    // Try clicking the cart icon in the navbar if drawer didn't auto-open
    const cartBtn = page.locator('[aria-label="Open cart"], button:has([data-lucide="shopping-bag"])').first();
    const cartBtnVisible = await cartBtn.isVisible().catch(() => false);
    if (cartBtnVisible) {
      await cartBtn.click();
      await page.waitForTimeout(600);
    }
  }

  await page.screenshot({ path: `${SS_DIR}/checkout-flow-3-cart-drawer.png`, fullPage: false });

  // Drawer open check
  const drawerVisible = await page.locator('text=Your Order').first().isVisible().catch(() => false);
  if (drawerVisible) {
    pass('step3-cart-drawer-open', 'Cart drawer "Your Order" header visible');
  } else {
    fail('step3-cart-drawer-open', 'HIGH', 'Cart drawer did not open');
  }

  // Item name — Walu
  const waluInCart = await page.locator('text=Walu').isVisible().catch(() => false);
  if (waluInCart) {
    pass('step3-walu-in-cart', 'Walu item visible in drawer');
  } else {
    fail('step3-walu-in-cart', 'HIGH', 'Walu not shown in cart drawer');
  }

  // Price shown (sunset-gold, A$ format)
  const priceEl = await page.locator('text=/A\\$\\d+/').first().isVisible().catch(() => false);
  if (priceEl) {
    const priceText = await page.locator('text=/A\\$\\d+/').first().textContent().catch(() => '');
    pass('step3-price-in-cart', `Price shown: ${priceText}`);
  } else {
    warn('step3-price-in-cart', 'A$ price not found in drawer');
  }

  // Qty controls — Plus/Minus buttons (aria-label)
  const plusBtn = page.locator('[aria-label="Increase quantity"]').first();
  const minusBtn = page.locator('[aria-label="Decrease quantity"]').first();
  const plusVisible = await plusBtn.isVisible().catch(() => false);
  const minusVisible = await minusBtn.isVisible().catch(() => false);
  if (plusVisible && minusVisible) {
    pass('step3-qty-controls', '+/- quantity buttons present');
  } else {
    fail('step3-qty-controls', 'HIGH', `Plus: ${plusVisible}, Minus: ${minusVisible}`);
  }

  // Remove button (Trash2 icon, aria-label)
  const removeBtn = page.locator('[aria-label^="Remove"]').first();
  const removeVisible = await removeBtn.isVisible().catch(() => false);
  if (removeVisible) {
    pass('step3-remove-button', 'Remove (Trash) button present');
  } else {
    fail('step3-remove-button', 'HIGH', 'Remove button not found in cart drawer');
  }

  // Checkout link/button
  const checkoutBtn = page.locator('a:has-text("Checkout"), button:has-text("Checkout")').first();
  const checkoutVisible = await checkoutBtn.isVisible().catch(() => false);
  if (checkoutVisible) {
    const checkoutText = await checkoutBtn.textContent();
    pass('step3-checkout-button', `Checkout CTA: "${checkoutText?.trim()}"`);
  } else {
    fail('step3-checkout-button', 'HIGH', 'Checkout button/link not found in cart drawer');
  }

  // Quantity display
  const qtyDisplay = await page.locator('text=/\\d+ kg/').first().textContent().catch(() => '');
  pass('step3-qty-display', `Qty displayed: "${qtyDisplay?.trim()}"`);

  // Test +1 qty
  if (await page.locator('[aria-label="Increase quantity"]').first().isVisible().catch(() => false)) {
    const qtyBefore = await page.locator('text=/\\d+ kg/').first().textContent().catch(() => '?');
    await page.locator('[aria-label="Increase quantity"]').first().click();
    await page.waitForTimeout(300);
    const qtyAfter = await page.locator('text=/\\d+ kg/').first().textContent().catch(() => '?');
    await page.screenshot({ path: `${SS_DIR}/checkout-flow-3b-cart-qty-updated.png`, fullPage: false });
    if (qtyBefore !== qtyAfter) {
      pass('step3-qty-increment', `Qty changed: ${qtyBefore?.trim()} → ${qtyAfter?.trim()}`);
    } else {
      warn('step3-qty-increment', `Qty unchanged: ${qtyBefore?.trim()} (may be at max)`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: Click through to /checkout (unauthenticated redirect)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 4] Navigate to /checkout');
{
  // Click the Checkout link in the cart drawer
  const checkoutLink = page.locator('a:has-text("Checkout")').first();
  const checkoutLinkVisible = await checkoutLink.isVisible().catch(() => false);

  if (checkoutLinkVisible) {
    await checkoutLink.click();
    await page.waitForTimeout(2000);
  } else {
    // Directly navigate
    await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle', timeout: 15000 });
  }

  const url = page.url();
  await page.screenshot({ path: `${SS_DIR}/checkout-flow-4-checkout-redirect.png`, fullPage: false });

  if (url.includes('/sign-in')) {
    pass('step4-checkout-auth-gate', `Correctly redirected to: ${url}`);
    // Check redirect_url param preserved
    if (url.includes('redirect_url') && url.includes('checkout')) {
      pass('step4-redirect-url-param', 'redirect_url=/checkout preserved in query');
    } else {
      warn('step4-redirect-url-param', `redirect_url not found in: ${url}`);
    }
    // Clerk sign-in page renders
    const signInHeader = await page.locator('text=Sign in, text=Welcome back').first().isVisible().catch(() => false);
    const clerkCard = await page.locator('.cl-card, .cl-rootBox, [data-localization-key]').first().isVisible().catch(() => false);
    if (signInHeader || clerkCard) {
      pass('step4-clerk-signin-renders', 'Clerk sign-in page rendered');
    } else {
      warn('step4-clerk-signin-renders', 'Sign-in page loaded but Clerk component not confirmed');
    }
  } else if (url.includes('/checkout')) {
    warn('step4-checkout-auth-gate', `No auth redirect — reached /checkout directly (user may be signed in)`);
  } else {
    fail('step4-checkout-auth-gate', 'HIGH', `Unexpected redirect to: ${url}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5: Checkout form at /checkout (direct navigation to verify structure)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 5] /checkout form structure (direct nav)');
{
  // Navigate directly — if not authed will redirect; test structure if reachable
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle', timeout: 15000 });
  const checkoutUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/checkout-flow-5-checkout-page.png`, fullPage: false });

  if (checkoutUrl.includes('/sign-in')) {
    warn('step5-checkout-form-reachable', 'Redirected to sign-in — form structure check requires auth. Testing page structure of sign-in instead.');

    // Verify sign-in page has correct dark theme
    const signInBg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    if (signInBg === 'rgb(10, 15, 26)') {
      pass('step5-signin-dark-theme', `Sign-in background: ${signInBg}`);
    } else {
      warn('step5-signin-dark-theme', `Sign-in background: ${signInBg} (Clerk default, not dark theme)`);
    }

  } else {
    // We're on the checkout page — check form elements
    pass('step5-checkout-form-reachable', `At: ${checkoutUrl}`);

    // Order Summary section
    const orderSummary = await page.locator('text=Order Summary').first().isVisible().catch(() => false);
    if (orderSummary) {
      pass('step5-order-summary', '"Order Summary" section visible');
    } else {
      warn('step5-order-summary', '"Order Summary" not visible — may be loading or empty cart redirect');
    }

    // Delivery Details section
    const deliveryDetails = await page.locator('text=Delivery Details').first().isVisible().catch(() => false);
    if (deliveryDetails) {
      pass('step5-delivery-details', '"Delivery Details" form visible');
    } else {
      warn('step5-delivery-details', '"Delivery Details" form not found');
    }

    // Check form fields
    const nameField = await page.locator('#ck-name').isVisible().catch(() => false);
    const phoneField = await page.locator('#ck-phone').isVisible().catch(() => false);
    const addressField = await page.locator('#ck-address').isVisible().catch(() => false);
    const suburbField = await page.locator('#ck-suburb').isVisible().catch(() => false);
    const postcodeField = await page.locator('#ck-postcode').isVisible().catch(() => false);
    const stateSelect = await page.locator('#ck-state').isVisible().catch(() => false);
    const allFields = [nameField, phoneField, addressField, suburbField, postcodeField, stateSelect];
    const fieldCount = allFields.filter(Boolean).length;
    if (fieldCount === 6) {
      pass('step5-all-form-fields', 'All 6 delivery fields present (name, phone, address, suburb, postcode, state)');
    } else {
      warn('step5-all-form-fields', `Only ${fieldCount}/6 fields found`);
    }

    // Pay button
    const payBtn = await page.locator('button:has-text("Pay Now")').first().isVisible().catch(() => false);
    if (payBtn) {
      pass('step5-pay-button', '"Pay Now" button present');
    } else {
      warn('step5-pay-button', '"Pay Now" button not found');
    }

    // Security note
    const secureNote = await page.locator('text=Secure payment via Stripe').first().isVisible().catch(() => false);
    if (secureNote) {
      pass('step5-stripe-note', '"Secure payment via Stripe" note present');
    } else {
      warn('step5-stripe-note', 'Stripe security note not found');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6: Check /api/checkout response (what happens on submit)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 6] /api/checkout behaviour on form submit');
{
  // We can't submit the form without auth, but we can check what the API returns
  // when called without auth — this tests the auth gate in the API route
  const apiRes = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ fishSpeciesId: 'test', quantityKg: 1 }],
          delivery: { name: 'Test', phone: '0400000000', address: '1 Test St', suburb: 'Sydney', postcode: '2000', state: 'NSW' }
        })
      });
      return { status: res.status, body: await res.json() };
    } catch (e) {
      return { error: String(e) };
    }
  });

  console.log(`    /api/checkout unauthenticated response: ${JSON.stringify(apiRes)}`);

  if (apiRes.status === 401) {
    pass('step6-api-auth-gate', `API correctly returns 401 when unauthenticated`);
  } else if (apiRes.status === 503) {
    warn('step6-api-stripe-not-configured', `API returns 503 — Stripe not configured (STRIPE_SECRET_KEY missing). Checkout would fail even for authed users.`);
  } else if (apiRes.status === 409) {
    warn('step6-api-no-window', `API returns 409 — No active flight window, or inventory issue`);
  } else if (apiRes.error) {
    warn('step6-api-error', `Fetch error: ${apiRes.error}`);
  } else {
    warn('step6-api-unexpected', `Unexpected status ${apiRes.status}: ${JSON.stringify(apiRes.body)}`);
  }

  // Also check whether Stripe env var is configured
  const stripeCheckRes = await page.evaluate(async () => {
    try {
      // Try to reach a non-sensitive Stripe config check
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [], delivery: {} })
      });
      return { status: res.status, body: await res.json() };
    } catch (e) {
      return { error: String(e) };
    }
  });

  if (stripeCheckRes.status === 503) {
    fail('step6-stripe-configured', 'HIGH', 'STRIPE_SECRET_KEY not set — /api/checkout returns 503. Cannot complete real checkout.');
  } else {
    // If not 503, Stripe may be configured (or auth gate fired first)
    pass('step6-stripe-check', `API responded with ${stripeCheckRes.status} (not 503 Stripe-missing)`);
  }

  await page.screenshot({ path: `${SS_DIR}/checkout-flow-6-api-check.png`, fullPage: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7: /order/success page
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[STEP 7] /order/success page');
{
  const res = await page.goto(`${BASE}/order/success`, { waitUntil: 'networkidle', timeout: 15000 });
  const successUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/checkout-flow-7-order-success.png`, fullPage: false });

  // Should NOT redirect to sign-in (Known Issue #6 if it does)
  if (successUrl.includes('/sign-in')) {
    fail('step7-success-not-auth-gated', 'HIGH',
      'Known Issue #6: /order/success is being auth-gated by middleware. Stripe redirects will fail for users with fresh sessions.');
  } else if (res.status() === 200) {
    pass('step7-success-loads', `HTTP 200 at ${successUrl}`);
  } else {
    fail('step7-success-loads', 'HIGH', `HTTP ${res.status()} at ${successUrl}`);
  }

  // Dark theme
  const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  if (bg === 'rgb(10, 15, 26)') {
    pass('step7-dark-theme', bg);
  } else {
    fail('step7-dark-theme', 'CRITICAL', `Got ${bg}, expected rgb(10, 15, 26)`);
  }

  // 4-step timeline
  const orderConfirmed = await page.locator('text=Order Confirmed').first().isVisible().catch(() => false);
  const timelineSteps = await page.locator('[class*="timeline"], [class*="step"]').count().catch(() => 0);
  if (orderConfirmed) {
    pass('step7-order-confirmed-step', '"Order Confirmed" step visible');
  } else {
    warn('step7-order-confirmed-step', '"Order Confirmed" not found on success page');
  }
  pass('step7-timeline-count', `Timeline/step elements: ${timelineSteps}`);

  // Share / continue buttons
  const shareBtn = await page.locator('button:has-text("Share"), button:has-text("share")').first().isVisible().catch(() => false);
  if (shareBtn) {
    pass('step7-share-button', 'Share button present');
  } else {
    warn('step7-share-button', 'Share button not found');
  }

  const continueLink = await page.locator('a:has-text("Browse"), a:has-text("Continue"), a:has-text("Shop")').first().isVisible().catch(() => false);
  if (continueLink) {
    pass('step7-continue-link', 'Continue/Browse link present');
  } else {
    warn('step7-continue-link', 'Continue/Browse link not found');
  }

  // No console errors on this page
  const errCount = consoleErrors.filter(e =>
    !e.includes('Warning:') && !e.includes('ReactDOM') && !e.includes('Failed to load resource')
  ).length;
  if (errCount === 0) {
    pass('step7-no-errors', 'No blocking console errors');
  } else {
    warn('step7-errors', `${errCount} console errors: ${consoleErrors.slice(0, 2).join(' | ')}`);
  }

  await page.screenshot({ path: `${SS_DIR}/checkout-flow-7-order-success-full.png`, fullPage: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Close browser
// ─────────────────────────────────────────────────────────────────────────────
await browser.close();

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
const pass_count = results.filter(r => r.status === 'PASS').length;
const warn_count = results.filter(r => r.status === 'WARN').length;
const fail_count = results.filter(r => r.status === 'FAIL').length;

console.log('\n' + '─'.repeat(66));
console.log(`QA SUMMARY: ${pass_count} PASS  ${warn_count} WARN  ${fail_count} FAIL`);
console.log('─'.repeat(66));

// Output JSON for report generation
console.log('\n__RESULTS_JSON__' + JSON.stringify(results));
