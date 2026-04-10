'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { SwipeCard } from '@/components/SwipeCard';
import { X, Heart, Star, RotateCcw } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  age: number;
  neighborhood?: string;
  photos: Array<{ id: string; url: string; position: number }>;
  prompts: Array<{ question: string; answer: string }>;
  is_verified: boolean;
  distance_km?: number;
}

export default function FeedPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchPopup, setMatchPopup] = useState<Profile | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getFeed(20);
      setProfiles(response.profiles);
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const currentProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  const handleLike = async () => {
    if (!currentProfile) return;

    try {
      const response = await api.like(currentProfile.id);
      if (response.match) {
        setMatchPopup(currentProfile);
      }
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handlePass = async () => {
    if (!currentProfile) return;

    try {
      await api.pass(currentProfile.id);
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      console.error('Pass failed:', err);
    }
  };

  const handleSuperlike = async () => {
    if (!currentProfile) return;

    try {
      const response = await api.superlike(currentProfile.id);
      if (response.match) {
        setMatchPopup(currentProfile);
      }
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      console.error('Superlike failed:', err);
    }
  };

  // Load more profiles when running low
  useEffect(() => {
    if (profiles.length > 0 && currentIndex >= profiles.length - 3) {
      loadFeed();
    }
  }, [currentIndex, profiles.length, loadFeed]);

  if (loading && profiles.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <button onClick={loadFeed} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="mb-4 text-6xl">✨</div>
        <h2 className="text-2xl font-semibold">No more profiles</h2>
        <p className="text-dark-400">
          Check back later for new people in your area
        </p>
        <button onClick={loadFeed} className="btn-primary mt-4">
          <RotateCcw className="mr-2 inline h-4 w-4" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden">
      {/* Cards stack */}
      <div className="relative h-[70vh] w-full max-w-sm px-4">
        {/* Next card preview */}
        {nextProfile && (
          <div className="absolute left-1/2 w-full max-w-sm -translate-x-1/2 scale-95 opacity-50">
            <div className="aspect-[3/4] rounded-2xl bg-dark-800" />
          </div>
        )}

        {/* Current card */}
        <SwipeCard
          key={currentProfile.id}
          profile={currentProfile}
          onLike={handleLike}
          onPass={handlePass}
          onSuperlike={handleSuperlike}
        />
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          onClick={handlePass}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500 text-red-500 transition-transform hover:scale-110 active:scale-95"
        >
          <X className="h-8 w-8" />
        </button>

        <button
          onClick={handleSuperlike}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-blue-500 text-blue-500 transition-transform hover:scale-110 active:scale-95"
        >
          <Star className="h-6 w-6" />
        </button>

        <button
          onClick={handleLike}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white transition-transform hover:scale-110 active:scale-95"
        >
          <Heart className="h-8 w-8" />
        </button>
      </div>

      {/* Match popup */}
      {matchPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-dark-900 p-8 text-center">
            <div className="mb-4 text-5xl">💖</div>
            <h2 className="mb-2 text-2xl font-bold">It's a Match!</h2>
            <p className="mb-6 text-dark-400">
              You and {matchPopup.name} liked each other
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMatchPopup(null)}
                className="btn-secondary flex-1"
              >
                Keep Swiping
              </button>
              <a
                href="/matches"
                className="btn-primary flex-1"
              >
                Send Message
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <p className="mt-4 text-sm text-dark-500">
        Tip: Use arrow keys to swipe
      </p>
    </div>
  );
}
