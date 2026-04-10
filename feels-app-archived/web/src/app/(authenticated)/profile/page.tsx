'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Camera, X, CheckCircle, Plus, Pencil } from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  position: number;
}

interface Prompt {
  question: string;
  answer: string;
}

interface Profile {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  neighborhood?: string;
  photos: Photo[];
  prompts: Prompt[];
  is_verified: boolean;
  looking_for?: string[];
}

const PROMPT_QUESTIONS = [
  "I'm looking for...",
  "My ideal first date...",
  "The way to my heart is...",
  "I geek out on...",
  "My most controversial opinion is...",
  "Two truths and a lie...",
];

export default function ProfilePage() {
  const { user, refreshUser } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.getProfile();
        setProfile(response.profile);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingPhoto(true);
    try {
      const position = profile.photos.length;
      const response = await api.uploadPhoto(file, position);
      setProfile({
        ...profile,
        photos: [...profile.photos, response],
      });
    } catch (err) {
      console.error('Failed to upload photo:', err);
      alert('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!profile) return;

    try {
      await api.deletePhoto(photoId);
      setProfile({
        ...profile,
        photos: profile.photos.filter((p) => p.id !== photoId),
      });
    } catch (err) {
      console.error('Failed to delete photo:', err);
    }
  };

  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveField = async () => {
    if (!editingField || !profile) return;

    setSaving(true);
    try {
      await api.updateProfile({
        [editingField]: editValue,
      });
      setProfile({
        ...profile,
        [editingField]: editValue,
      });
      refreshUser();
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  };

  const savePrompt = async (index: number) => {
    if (!profile) return;

    const newPrompts = [...(profile.prompts || [])];
    const question = PROMPT_QUESTIONS[index % PROMPT_QUESTIONS.length];

    if (editValue.trim()) {
      if (newPrompts[index]) {
        newPrompts[index] = { question, answer: editValue };
      } else {
        newPrompts.push({ question, answer: editValue });
      }
    } else if (newPrompts[index]) {
      newPrompts.splice(index, 1);
    }

    setSaving(true);
    try {
      await api.updateProfile({ prompts: newPrompts });
      setProfile({
        ...profile,
        prompts: newPrompts,
      });
    } catch (err) {
      console.error('Failed to update prompts:', err);
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Your Profile</h1>

      {/* Photos grid */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase text-dark-400">
          Photos
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 5].map((position) => {
            const photo = profile?.photos.find((p) => p.position === position);
            return (
              <div
                key={position}
                className="relative aspect-[3/4] overflow-hidden rounded-xl bg-dark-800"
              >
                {photo ? (
                  <>
                    <Image
                      src={photo.url}
                      alt={`Photo ${position + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 transition-colors hover:bg-black/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex h-full w-full flex-col items-center justify-center gap-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-white"
                  >
                    {uploadingPhoto ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Plus className="h-8 w-8" />
                        <span className="text-sm">Add</span>
                      </>
                    )}
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
          onChange={handlePhotoUpload}
          className="hidden"
        />
      </section>

      {/* Basic info */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase text-dark-400">
          Basic Info
        </h2>
        <div className="space-y-4 rounded-xl bg-dark-900 p-4">
          {/* Name */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-400">Name</p>
              {editingField === 'name' ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="input mt-1"
                  autoFocus
                />
              ) : (
                <p className="font-semibold">{profile?.name || user?.name}</p>
              )}
            </div>
            {editingField === 'name' ? (
              <button
                onClick={saveField}
                disabled={saving}
                className="btn-primary px-4 py-2"
              >
                {saving ? '...' : 'Save'}
              </button>
            ) : (
              <button
                onClick={() => startEditing('name', profile?.name || '')}
                className="rounded-lg p-2 text-dark-400 transition-colors hover:bg-dark-800 hover:text-white"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Bio */}
          <div className="border-t border-dark-700 pt-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-dark-400">Bio</p>
                {editingField === 'bio' ? (
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="input mt-1 min-h-[80px] resize-none"
                    autoFocus
                  />
                ) : (
                  <p className="mt-1">{profile?.bio || 'Add a bio'}</p>
                )}
              </div>
              {editingField === 'bio' ? (
                <button
                  onClick={saveField}
                  disabled={saving}
                  className="btn-primary ml-4 px-4 py-2"
                >
                  {saving ? '...' : 'Save'}
                </button>
              ) : (
                <button
                  onClick={() => startEditing('bio', profile?.bio || '')}
                  className="rounded-lg p-2 text-dark-400 transition-colors hover:bg-dark-800 hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Neighborhood */}
          <div className="border-t border-dark-700 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-400">Neighborhood</p>
                {editingField === 'neighborhood' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="input mt-1"
                    placeholder="e.g., Williamsburg"
                    autoFocus
                  />
                ) : (
                  <p className="font-semibold">
                    {profile?.neighborhood || 'Add your neighborhood'}
                  </p>
                )}
              </div>
              {editingField === 'neighborhood' ? (
                <button
                  onClick={saveField}
                  disabled={saving}
                  className="btn-primary px-4 py-2"
                >
                  {saving ? '...' : 'Save'}
                </button>
              ) : (
                <button
                  onClick={() =>
                    startEditing('neighborhood', profile?.neighborhood || '')
                  }
                  className="rounded-lg p-2 text-dark-400 transition-colors hover:bg-dark-800 hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Prompts */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase text-dark-400">
          Prompts
        </h2>
        <div className="space-y-4">
          {[0, 1, 2].map((index) => {
            const prompt = profile?.prompts?.[index];
            const question =
              prompt?.question || PROMPT_QUESTIONS[index % PROMPT_QUESTIONS.length];

            return (
              <div key={index} className="rounded-xl bg-dark-900 p-4">
                <p className="text-sm text-dark-400">{question}</p>
                {editingField === `prompt-${index}` ? (
                  <div className="mt-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="input min-h-[60px] resize-none"
                      placeholder="Your answer..."
                      autoFocus
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setEditingField(null)}
                        className="btn-secondary px-4 py-2"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => savePrompt(index)}
                        disabled={saving}
                        className="btn-primary px-4 py-2"
                      >
                        {saving ? '...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex items-start justify-between">
                    <p className="flex-1">
                      {prompt?.answer || (
                        <span className="text-dark-500">Tap to add...</span>
                      )}
                    </p>
                    <button
                      onClick={() =>
                        startEditing(`prompt-${index}`, prompt?.answer || '')
                      }
                      className="rounded-lg p-2 text-dark-400 transition-colors hover:bg-dark-800 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Verification badge */}
      {profile?.is_verified ? (
        <div className="flex items-center gap-3 rounded-xl bg-blue-500/20 p-4">
          <CheckCircle className="h-6 w-6 text-blue-500" />
          <div>
            <p className="font-semibold">Verified Profile</p>
            <p className="text-sm text-dark-400">
              Your profile is verified with photo ID
            </p>
          </div>
        </div>
      ) : (
        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-dark-900 p-4 transition-colors hover:bg-dark-800">
          <Camera className="h-5 w-5 text-blue-500" />
          <span>Verify your profile</span>
        </button>
      )}
    </div>
  );
}
