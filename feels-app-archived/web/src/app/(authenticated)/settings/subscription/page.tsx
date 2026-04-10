'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Crown,
  Check,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

interface Subscription {
  status: string;
  plan?: string;
  expires_at?: string;
  cancel_at_period_end?: boolean;
}

const FEATURES = [
  'Unlimited likes',
  'See who likes you',
  'Rewind last swipe',
  '5 Super Likes per day',
  'Priority in feed',
  'No ads',
  'Read receipts',
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    async function loadSubscription() {
      try {
        const data = await api.getSubscription();
        setSubscription(data);
      } catch (err) {
        console.error('Failed to load subscription:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSubscription();
  }, []);

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const { url } = await api.createPortalSession();
      window.location.href = url;
    } catch (err) {
      console.error('Failed to open portal:', err);
      alert('Failed to open subscription management. Please try again.');
    } finally {
      setOpeningPortal(false);
    }
  };

  const isActive =
    subscription?.status === 'active' || subscription?.status === 'trialing';
  const planName = subscription?.plan?.replace('_', ' ') || 'Premium';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => router.push('/settings')}
          className="rounded-lg p-2 transition-colors hover:bg-dark-800"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold">Subscription</h1>
      </div>

      {/* Current plan */}
      <section className="mb-8">
        <div
          className={`rounded-xl p-6 ${
            isActive
              ? 'bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/30'
              : 'bg-dark-900'
          }`}
        >
          <div className="mb-4 flex items-center gap-3">
            <Crown
              className={`h-8 w-8 ${isActive ? 'text-primary' : 'text-dark-400'}`}
            />
            <div>
              <h2 className="text-xl font-bold">
                {isActive ? `Feels ${planName}` : 'Free Plan'}
              </h2>
              <p className="text-sm text-dark-400">
                {isActive
                  ? subscription?.cancel_at_period_end
                    ? `Cancels on ${new Date(subscription.expires_at!).toLocaleDateString()}`
                    : `Renews on ${new Date(subscription?.expires_at || '').toLocaleDateString()}`
                  : 'Upgrade to unlock all features'}
              </p>
            </div>
          </div>

          {subscription?.cancel_at_period_end && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-orange-500/20 p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
              <p>
                Your subscription will end on{' '}
                {new Date(subscription.expires_at!).toLocaleDateString()}. You
                can resubscribe anytime.
              </p>
            </div>
          )}

          {isActive ? (
            <button
              onClick={handleManageSubscription}
              disabled={openingPortal}
              className="btn-secondary w-full"
            >
              {openingPortal ? (
                'Opening...'
              ) : (
                <>
                  Manage Subscription
                  <ExternalLink className="ml-2 inline h-4 w-4" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleManageSubscription}
              disabled={openingPortal}
              className="btn-primary w-full"
            >
              {openingPortal ? 'Opening...' : 'Upgrade to Premium'}
            </button>
          )}
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase text-dark-400">
          Premium Features
        </h2>
        <div className="space-y-3">
          {FEATURES.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-3 rounded-xl bg-dark-900 p-4"
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  isActive ? 'bg-primary' : 'bg-dark-700'
                }`}
              >
                <Check
                  className={`h-4 w-4 ${isActive ? 'text-white' : 'text-dark-400'}`}
                />
              </div>
              <span className={isActive ? '' : 'text-dark-400'}>{feature}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase text-dark-400">
          FAQ
        </h2>
        <div className="space-y-4 rounded-xl bg-dark-900 p-4">
          <div>
            <h3 className="font-semibold">Can I cancel anytime?</h3>
            <p className="mt-1 text-sm text-dark-400">
              Yes! You can cancel your subscription at any time. You'll keep
              access until the end of your billing period.
            </p>
          </div>
          <div className="border-t border-dark-700 pt-4">
            <h3 className="font-semibold">What payment methods do you accept?</h3>
            <p className="mt-1 text-sm text-dark-400">
              We accept all major credit cards, Apple Pay, and Google Pay
              through our secure payment provider Stripe.
            </p>
          </div>
          <div className="border-t border-dark-700 pt-4">
            <h3 className="font-semibold">Can I get a refund?</h3>
            <p className="mt-1 text-sm text-dark-400">
              Refunds are handled on a case-by-case basis. Contact us at
              support@feels.fun if you have any issues.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
