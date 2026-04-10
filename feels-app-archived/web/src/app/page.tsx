'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize, sendMagicLink } = useAuthStore();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/feed');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      await sendMagicLink(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-12 text-center">
          <h1 className="gradient-text mb-2 text-5xl font-bold">feels</h1>
          <p className="text-dark-400">Find your vibe in NYC</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm text-dark-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                required
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={sending || !email}
              className="btn-primary w-full disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Continue with Email'}
            </button>

            <p className="text-center text-sm text-dark-400">
              We'll send you a magic link to sign in
            </p>
          </form>
        ) : (
          <div className="text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
              <svg
                className="h-8 w-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-semibold">Check your email</h2>
            <p className="mb-6 text-dark-400">
              We sent a magic link to <span className="text-white">{email}</span>
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-primary hover:underline"
            >
              Use a different email
            </button>
          </div>
        )}

        {/* Footer links */}
        <div className="mt-12 text-center text-sm text-dark-500">
          <a href="https://feels.fun/privacy" className="hover:text-white">
            Privacy Policy
          </a>
          <span className="mx-2">·</span>
          <a href="https://feels.fun/terms" className="hover:text-white">
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}
