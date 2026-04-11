import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // Not a hard throw — allow the app to build without Stripe keys.
  // Checkout API will return a clear error at request time.
  console.warn("[stripe] STRIPE_SECRET_KEY is not set — checkout will be unavailable");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
    })
  : null;
