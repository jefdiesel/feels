'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyMagicLink, isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError('Invalid or missing token');
      return;
    }

    verifyMagicLink(token)
      .then((isNewUser) => {
        setStatus('success');
        // Redirect after a brief delay to show success
        setTimeout(() => {
          router.push(isNewUser ? '/profile/setup' : '/feed');
        }, 1500);
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message || 'Verification failed');
      });
  }, [searchParams, verifyMagicLink, router]);

  useEffect(() => {
    if (isAuthenticated && status !== 'verifying') {
      router.push('/feed');
    }
  }, [isAuthenticated, status, router]);

  return (
    <div className="w-full max-w-md text-center">
      {status === 'verifying' && (
        <>
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <h2 className="mb-2 text-2xl font-semibold">Verifying...</h2>
          <p className="text-dark-400">Please wait while we sign you in</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <svg
              className="h-8 w-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-semibold">You're in!</h2>
          <p className="text-dark-400">Redirecting you now...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-semibold">Verification failed</h2>
          <p className="mb-6 text-dark-400">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full max-w-md text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
      <h2 className="mb-2 text-2xl font-semibold">Loading...</h2>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Suspense fallback={<LoadingFallback />}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
