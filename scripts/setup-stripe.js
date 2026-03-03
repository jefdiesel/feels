#!/usr/bin/env node

/**
 * Setup Stripe Products and Prices for Feels Dating App
 *
 * Run with: STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe.js
 *
 * This creates the subscription products and prices in your Stripe account
 * and outputs the price IDs to add to your .env file.
 */

const Stripe = require('stripe');

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey || secretKey.includes('placeholder')) {
  console.error('Error: Set STRIPE_SECRET_KEY environment variable to your Stripe test key');
  console.error('Usage: STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe.js');
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const plans = [
  {
    name: 'Feels Premium Monthly',
    description: 'Unlimited likes, see who liked you, rewind last swipe',
    amount: 999, // $9.99
    interval: 'month',
    intervalCount: 1,
    metadata: { plan_type: 'monthly' },
  },
  {
    name: 'Feels Premium Quarterly',
    description: 'Best value! Unlimited likes, rewinds, 5 super likes/day, weekly boost',
    amount: 1993, // $19.93
    interval: 'month',
    intervalCount: 3,
    metadata: { plan_type: 'quarterly' },
  },
  {
    name: 'Feels Premium Annual',
    description: 'All features unlocked - unlimited super likes, daily boost, incognito mode',
    amount: 5999, // $59.99
    interval: 'year',
    intervalCount: 1,
    metadata: { plan_type: 'annual' },
  },
];

async function setupStripe() {
  console.log('Setting up Stripe products and prices...\n');

  const priceIds = {};

  for (const plan of plans) {
    console.log(`Creating product: ${plan.name}`);

    // Create the product
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });

    console.log(`  Product ID: ${product.id}`);

    // Create the price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount,
      currency: 'usd',
      recurring: {
        interval: plan.interval,
        interval_count: plan.intervalCount,
      },
      metadata: plan.metadata,
    });

    console.log(`  Price ID: ${price.id}`);
    console.log(`  Amount: $${(plan.amount / 100).toFixed(2)}/${plan.intervalCount > 1 ? plan.intervalCount + ' ' : ''}${plan.interval}${plan.intervalCount > 1 ? 's' : ''}`);
    console.log('');

    priceIds[plan.metadata.plan_type] = price.id;
  }

  console.log('='.repeat(60));
  console.log('\nAdd these to your .env file:\n');
  console.log(`STRIPE_MONTHLY_PRICE_ID=${priceIds.monthly}`);
  console.log(`STRIPE_QUARTERLY_PRICE_ID=${priceIds.quarterly}`);
  console.log(`STRIPE_ANNUAL_PRICE_ID=${priceIds.annual}`);
  console.log('\n' + '='.repeat(60));

  // Also create a webhook endpoint reminder
  console.log('\nWebhook Setup:');
  console.log('1. Go to https://dashboard.stripe.com/test/webhooks');
  console.log('2. Add endpoint: https://your-domain.com/api/payments/webhook');
  console.log('3. Select events: checkout.session.completed, customer.subscription.updated,');
  console.log('   customer.subscription.deleted, invoice.payment_failed');
  console.log('4. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env');
}

setupStripe().catch((err) => {
  console.error('Error setting up Stripe:', err.message);
  process.exit(1);
});
