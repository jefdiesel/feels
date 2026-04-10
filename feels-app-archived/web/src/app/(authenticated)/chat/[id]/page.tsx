'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { formatTime, formatDate } from '@/lib/utils';
import { ArrowLeft, Send, MoreVertical, Flag, UserX } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  image_url?: string;
}

interface MatchProfile {
  id: string;
  user_id: string;
  name: string;
  photos: Array<{ url: string }>;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [profile, setProfile] = useState<MatchProfile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(async () => {
    try {
      const [matchResponse, messagesResponse] = await Promise.all([
        api.getMatch(matchId),
        api.getMessages(matchId),
      ]);
      setProfile(matchResponse.profile as MatchProfile);
      setMessages(messagesResponse.messages || []);
    } catch (err) {
      console.error('Failed to load chat:', err);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: user?.id || '',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const message = await api.sendMessage(matchId, content);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? message : m))
      );
    } catch {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setNewMessage(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleUnmatch = async () => {
    if (!confirm('Are you sure you want to unmatch? This cannot be undone.')) {
      return;
    }

    try {
      await api.unmatch(matchId);
      router.push('/matches');
    } catch (err) {
      console.error('Failed to unmatch:', err);
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce<Record<string, Message[]>>(
    (groups, message) => {
      const date = formatDate(message.created_at);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {}
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-dark-800 bg-dark px-4 py-3">
        <button
          onClick={() => router.push('/matches')}
          className="rounded-lg p-2 transition-colors hover:bg-dark-800"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>

        {profile && (
          <div className="flex flex-1 items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full">
              {profile.photos[0] ? (
                <Image
                  src={profile.photos[0].url}
                  alt={profile.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-dark-800">
                  {profile.name[0]}
                </div>
              )}
            </div>
            <div>
              <h1 className="font-semibold">{profile.name}</h1>
            </div>
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg p-2 transition-colors hover:bg-dark-800"
          >
            <MoreVertical className="h-6 w-6" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-dark-900 py-2 shadow-xl">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    // TODO: Report user
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-dark-800"
                >
                  <Flag className="h-5 w-5 text-orange-500" />
                  <span>Report</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleUnmatch();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-dark-800"
                >
                  <UserX className="h-5 w-5 text-red-500" />
                  <span>Unmatch</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="mb-2 text-lg font-semibold">Start the conversation!</p>
            <p className="text-dark-400">
              Say hi to {profile?.name} and see where it goes
            </p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dayMessages]) => (
            <div key={date}>
              <div className="my-4 flex items-center justify-center">
                <span className="rounded-full bg-dark-800 px-3 py-1 text-xs text-dark-400">
                  {date}
                </span>
              </div>
              {dayMessages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`mb-2 flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        isOwn
                          ? 'rounded-br-sm bg-primary'
                          : 'rounded-bl-sm bg-dark-800'
                      }`}
                    >
                      {message.image_url && (
                        <div className="mb-2 overflow-hidden rounded-lg">
                          <Image
                            src={message.image_url}
                            alt="Shared image"
                            width={200}
                            height={200}
                            className="object-cover"
                          />
                        </div>
                      )}
                      <p className="break-words">{message.content}</p>
                      <p
                        className={`mt-1 text-xs ${
                          isOwn ? 'text-white/60' : 'text-dark-400'
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-3 border-t border-dark-800 bg-dark p-4"
      >
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="input flex-1"
          autoFocus
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white transition-transform hover:scale-105 disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
