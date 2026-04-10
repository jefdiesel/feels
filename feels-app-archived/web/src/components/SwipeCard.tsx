'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { MapPin, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

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

interface SwipeCardProps {
  profile: Profile;
  onLike: () => void;
  onPass: () => void;
  onSuperlike: () => void;
}

export function SwipeCard({ profile, onLike, onPass, onSuperlike }: SwipeCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-20, 0, 20]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const photos = profile.photos.sort((a, b) => a.position - b.position);

  const handleDragEnd = (_: never, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      setExitDirection('right');
      onLike();
    } else if (info.offset.x < -threshold) {
      setExitDirection('left');
      onPass();
    }
  };

  const nextPhoto = () => {
    if (photoIndex < photos.length - 1) {
      setPhotoIndex(photoIndex + 1);
    }
  };

  const prevPhoto = () => {
    if (photoIndex > 0) {
      setPhotoIndex(photoIndex - 1);
    }
  };

  return (
    <motion.div
      className="absolute left-1/2 w-full max-w-sm -translate-x-1/2 cursor-grab active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={
        exitDirection
          ? { x: exitDirection === 'right' ? 500 : -500, opacity: 0 }
          : {}
      }
      transition={{ duration: 0.3 }}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-dark-900 shadow-2xl">
        {/* Photo */}
        {photos.length > 0 && (
          <Image
            src={photos[photoIndex].url}
            alt={profile.name}
            fill
            className="object-cover"
            priority
          />
        )}

        {/* Photo indicators */}
        {photos.length > 1 && (
          <div className="absolute left-4 right-4 top-4 flex gap-1">
            {photos.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full ${
                  idx === photoIndex ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        {/* Photo navigation */}
        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 opacity-0 transition-opacity hover:opacity-100"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 opacity-0 transition-opacity hover:opacity-100"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Like/Nope indicators */}
        <motion.div
          className="absolute left-6 top-16 rotate-[-20deg] rounded-lg border-4 border-green-500 px-4 py-2"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-3xl font-bold text-green-500">LIKE</span>
        </motion.div>
        <motion.div
          className="absolute right-6 top-16 rotate-[20deg] rounded-lg border-4 border-red-500 px-4 py-2"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-3xl font-bold text-red-500">NOPE</span>
        </motion.div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Profile info */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-2xl font-bold">
              {profile.name}, {profile.age}
            </h2>
            {profile.is_verified && (
              <CheckCircle className="h-5 w-5 text-blue-500" />
            )}
          </div>

          {profile.neighborhood && (
            <div className="mb-2 flex items-center gap-1 text-sm text-white/80">
              <MapPin className="h-4 w-4" />
              <span>{profile.neighborhood}</span>
              {profile.distance_km && (
                <span className="text-white/60">
                  · {profile.distance_km.toFixed(1)} km
                </span>
              )}
            </div>
          )}

          {profile.bio && (
            <p className="line-clamp-2 text-sm text-white/80">{profile.bio}</p>
          )}

          {profile.prompts && profile.prompts.length > 0 && (
            <div className="mt-3 rounded-lg bg-white/10 p-3">
              <p className="text-xs text-white/60">{profile.prompts[0].question}</p>
              <p className="mt-1 text-sm">{profile.prompts[0].answer}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
