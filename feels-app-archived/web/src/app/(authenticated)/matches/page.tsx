'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { formatDistanceToNow } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';

interface Match {
  id: string;
  profile: {
    id: string;
    user_id: string;
    name: string;
    photos: Array<{ url: string }>;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
  created_at: string;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadMatches() {
      try {
        const response = await api.getMatches();
        setMatches(response.matches || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load matches');
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, []);

  if (loading) {
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
      </div>
    );
  }

  const newMatches = matches.filter((m) => !m.last_message);
  const conversations = matches.filter((m) => m.last_message);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Matches</h1>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle className="mb-4 h-16 w-16 text-dark-600" />
          <h2 className="mb-2 text-xl font-semibold">No matches yet</h2>
          <p className="text-dark-400">
            Keep swiping to find your match!
          </p>
          <Link href="/feed" className="btn-primary mt-4">
            Go to Feed
          </Link>
        </div>
      ) : (
        <>
          {/* New matches */}
          {newMatches.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-sm font-semibold uppercase text-dark-400">
                New Matches
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {newMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/chat/${match.id}`}
                    className="flex-shrink-0"
                  >
                    <div className="relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-primary ring-offset-2 ring-offset-dark">
                      {match.profile.photos[0] ? (
                        <Image
                          src={match.profile.photos[0].url}
                          alt={match.profile.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-dark-800 text-2xl">
                          {match.profile.name[0]}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-center text-sm">
                      {match.profile.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Conversations */}
          {conversations.length > 0 && (
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase text-dark-400">
                Messages
              </h2>
              <div className="space-y-2">
                {conversations.map((match) => (
                  <Link
                    key={match.id}
                    href={`/chat/${match.id}`}
                    className="flex items-center gap-4 rounded-xl bg-dark-900 p-4 transition-colors hover:bg-dark-800"
                  >
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full">
                      {match.profile.photos[0] ? (
                        <Image
                          src={match.profile.photos[0].url}
                          alt={match.profile.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-dark-800 text-xl">
                          {match.profile.name[0]}
                        </div>
                      )}
                      {match.unread_count > 0 && (
                        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold">
                          {match.unread_count}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{match.profile.name}</h3>
                        {match.last_message && (
                          <span className="text-xs text-dark-400">
                            {formatDistanceToNow(match.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      {match.last_message && (
                        <p className="truncate text-sm text-dark-400">
                          {match.last_message.content}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
