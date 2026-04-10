'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import {
  Bell,
  Shield,
  CreditCard,
  LogOut,
  Trash2,
  ChevronRight,
  Eye,
  MessageSquare,
  Heart,
  Mail,
  Search,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [notificationSettings, setNotificationSettings] = useState({
    new_matches: true,
    new_messages: true,
    likes: true,
    marketing: false,
  });
  const [privacySettings, setPrivacySettings] = useState({
    show_online_status: true,
    show_read_receipts: true,
    discoverable: true,
  });
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [notifications, privacy] = await Promise.all([
          api.getNotificationSettings(),
          api.getPrivacySettings(),
        ]);
        setNotificationSettings(notifications);
        setPrivacySettings(privacy);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const updateNotificationSetting = async (key: string, value: boolean) => {
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);
    try {
      await api.updateNotificationSettings({ [key]: value });
    } catch (err) {
      // Revert on error
      setNotificationSettings(notificationSettings);
    }
  };

  const updatePrivacySetting = async (key: string, value: boolean) => {
    const newSettings = { ...privacySettings, [key]: value };
    setPrivacySettings(newSettings);
    try {
      await api.updatePrivacySettings({ [key]: value });
    } catch (err) {
      // Revert on error
      setPrivacySettings(privacySettings);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        'Are you sure you want to delete your account? This cannot be undone.'
      )
    ) {
      return;
    }

    if (
      !confirm(
        'This will permanently delete all your data including matches and messages. Continue?'
      )
    ) {
      return;
    }

    try {
      await api.deleteAccount();
      await logout();
      router.push('/');
    } catch (err) {
      alert('Failed to delete account. Please try again.');
    }
  };

  const Toggle = ({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
  }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        enabled ? 'bg-primary' : 'bg-dark-600'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Settings</h1>

      {/* Account info */}
      <section className="mb-8 rounded-xl bg-dark-900 p-4">
        <h2 className="mb-4 text-sm font-semibold uppercase text-dark-400">
          Account
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-dark-400">Email</p>
            <p className="font-semibold">{user?.email}</p>
          </div>
          {user?.phone && (
            <div className="border-t border-dark-700 pt-4">
              <p className="text-sm text-dark-400">Phone</p>
              <p className="font-semibold">{user.phone}</p>
            </div>
          )}
        </div>
      </section>

      {/* Notifications */}
      <section className="mb-8">
        <button
          onClick={() =>
            setActiveSection(
              activeSection === 'notifications' ? null : 'notifications'
            )
          }
          className="flex w-full items-center justify-between rounded-xl bg-dark-900 p-4"
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <span className="font-semibold">Notifications</span>
          </div>
          <ChevronRight
            className={`h-5 w-5 text-dark-400 transition-transform ${
              activeSection === 'notifications' ? 'rotate-90' : ''
            }`}
          />
        </button>

        {activeSection === 'notifications' && (
          <div className="mt-2 space-y-2 rounded-xl bg-dark-900 p-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-dark-400" />
                <span>New matches</span>
              </div>
              <Toggle
                enabled={notificationSettings.new_matches}
                onChange={(v) => updateNotificationSetting('new_matches', v)}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-dark-400" />
                <span>New messages</span>
              </div>
              <Toggle
                enabled={notificationSettings.new_messages}
                onChange={(v) => updateNotificationSetting('new_messages', v)}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-dark-400" />
                <span>Likes</span>
              </div>
              <Toggle
                enabled={notificationSettings.likes}
                onChange={(v) => updateNotificationSetting('likes', v)}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-dark-400" />
                <span>Marketing emails</span>
              </div>
              <Toggle
                enabled={notificationSettings.marketing}
                onChange={(v) => updateNotificationSetting('marketing', v)}
              />
            </div>
          </div>
        )}
      </section>

      {/* Privacy */}
      <section className="mb-8">
        <button
          onClick={() =>
            setActiveSection(activeSection === 'privacy' ? null : 'privacy')
          }
          className="flex w-full items-center justify-between rounded-xl bg-dark-900 p-4"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">Privacy</span>
          </div>
          <ChevronRight
            className={`h-5 w-5 text-dark-400 transition-transform ${
              activeSection === 'privacy' ? 'rotate-90' : ''
            }`}
          />
        </button>

        {activeSection === 'privacy' && (
          <div className="mt-2 space-y-2 rounded-xl bg-dark-900 p-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-dark-400" />
                <span>Show online status</span>
              </div>
              <Toggle
                enabled={privacySettings.show_online_status}
                onChange={(v) => updatePrivacySetting('show_online_status', v)}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-dark-400" />
                <span>Read receipts</span>
              </div>
              <Toggle
                enabled={privacySettings.show_read_receipts}
                onChange={(v) => updatePrivacySetting('show_read_receipts', v)}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-dark-400" />
                <span>Discoverable in feed</span>
              </div>
              <Toggle
                enabled={privacySettings.discoverable}
                onChange={(v) => updatePrivacySetting('discoverable', v)}
              />
            </div>
          </div>
        )}
      </section>

      {/* Subscription */}
      <section className="mb-8">
        <Link
          href="/settings/subscription"
          className="flex w-full items-center justify-between rounded-xl bg-dark-900 p-4 transition-colors hover:bg-dark-800"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <span className="font-semibold">Subscription</span>
          </div>
          <ChevronRight className="h-5 w-5 text-dark-400" />
        </Link>
      </section>

      {/* Danger zone */}
      <section className="space-y-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl bg-dark-900 p-4 transition-colors hover:bg-dark-800"
        >
          <LogOut className="h-5 w-5 text-orange-500" />
          <span>Log out</span>
        </button>

        <button
          onClick={handleDeleteAccount}
          className="flex w-full items-center gap-3 rounded-xl bg-dark-900 p-4 text-red-500 transition-colors hover:bg-dark-800"
        >
          <Trash2 className="h-5 w-5" />
          <span>Delete account</span>
        </button>
      </section>

      {/* Legal links */}
      <div className="mt-8 text-center text-sm text-dark-500">
        <a href="https://feels.fun/privacy" className="hover:text-white">
          Privacy Policy
        </a>
        <span className="mx-2">·</span>
        <a href="https://feels.fun/terms" className="hover:text-white">
          Terms of Service
        </a>
      </div>
    </div>
  );
}
