'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Camera, ArrowRight, Plus, X } from 'lucide-react';

const NEIGHBORHOODS = [
  'Williamsburg',
  'Bushwick',
  'Greenpoint',
  'Park Slope',
  'DUMBO',
  'Crown Heights',
  'Bed-Stuy',
  'Fort Greene',
  'Cobble Hill',
  'Carroll Gardens',
  'East Village',
  'West Village',
  'SoHo',
  'Chelsea',
  'Upper East Side',
  'Upper West Side',
  'Harlem',
  'Astoria',
  'Long Island City',
  'Other',
];

export default function ProfileSetupPage() {
  const router = useRouter();
  const { refreshUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 6));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePhotoRemove = (index: number) => {
    setPhotos((prev) => {
      const photo = prev[index];
      URL.revokeObjectURL(photo.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      // Create profile
      await api.updateProfile({
        name,
        bio,
        neighborhood,
      });

      // Upload photos
      for (let i = 0; i < photos.length; i++) {
        await api.uploadPhoto(photos[i].file, i);
      }

      // Refresh user data
      await refreshUser();

      // Redirect to feed
      router.push('/feed');
    } catch (err) {
      console.error('Failed to complete setup:', err);
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed =
    (step === 1 && name.trim().length >= 2) ||
    (step === 2 && photos.length >= 1) ||
    step === 3;

  return (
    <div className="flex min-h-screen flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-md flex-1">
        {/* Progress */}
        <div className="mb-8 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? 'bg-primary' : 'bg-dark-700'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Name & Bio */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="mb-2 text-2xl font-bold">What's your name?</h1>
              <p className="text-dark-400">
                This is how you'll appear to others
              </p>
            </div>

            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="input text-center text-xl"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-dark-400">
                Bio (optional)
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about yourself..."
                className="input min-h-[100px] resize-none"
                maxLength={500}
              />
              <p className="mt-1 text-right text-sm text-dark-500">
                {bio.length}/500
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-dark-400">
                Neighborhood
              </label>
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="input"
              >
                <option value="">Select your neighborhood</option>
                {NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Photos */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="mb-2 text-2xl font-bold">Add your photos</h1>
              <p className="text-dark-400">
                Add at least 1 photo. Profiles with more photos get more
                matches!
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const photo = photos[index];
                return (
                  <div
                    key={index}
                    className="relative aspect-[3/4] overflow-hidden rounded-xl bg-dark-800"
                  >
                    {photo ? (
                      <>
                        <Image
                          src={photo.preview}
                          alt={`Photo ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <button
                          onClick={() => handlePhotoRemove(index)}
                          className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-full w-full flex-col items-center justify-center gap-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-white"
                      >
                        <Plus className="h-8 w-8" />
                        <span className="text-sm">Add</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoAdd}
              className="hidden"
            />
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="mb-2 text-2xl font-bold">Looking good! 🔥</h1>
              <p className="text-dark-400">
                Here's how your profile will look
              </p>
            </div>

            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-dark-800">
              {photos[0] && (
                <Image
                  src={photos[0].preview}
                  alt="Profile preview"
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="text-2xl font-bold">{name}</h2>
                {neighborhood && (
                  <p className="text-sm text-white/80">{neighborhood}</p>
                )}
                {bio && (
                  <p className="mt-2 line-clamp-2 text-sm text-white/80">
                    {bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mx-auto w-full max-w-md pt-8">
        <button
          onClick={step === 3 ? handleComplete : handleNext}
          disabled={!canProceed || loading}
          className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Setting up...
            </>
          ) : step === 3 ? (
            'Start Swiping'
          ) : (
            <>
              Continue
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>

        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="mt-4 w-full py-2 text-dark-400 hover:text-white"
          >
            Go back
          </button>
        )}
      </div>
    </div>
  );
}
