import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { api, profileApi, referralApi } from '@/api/client';
import PremiumModal from '@/components/PremiumModal';
import PhotoGrid from '@/components/PhotoGrid';
import {
  SettingsIcon,
  UserIcon,
  EditIcon,
  MapPinIcon,
  CoinIcon,
  HeartFilledIcon,
  CrownIcon,
  SlidersIcon,
  BellIcon,
  ShieldIcon,
  HelpCircleIcon,
  LogOutIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
  ShareIcon,
  GiftIcon,
  SparklesIcon,
} from '@/components/Icons';
import { colors, typography, borderRadius, spacing, shadows } from '@/constants/theme';

interface Photo {
  id: string;
  url: string;
  position: number;
}

interface ProfilePrompt {
  question: string;
  answer: string;
}

const AVAILABLE_PROMPTS = [
  // Intentions & Energy
  "I'm done playing it safe, now I want...",
  "The energy I'm looking for is...",
  "I know what I want, and it's...",
  "Green flags that make me say yes...",

  // Conversation starters
  "Ask me about the time I...",
  "The story I love telling is...",
  "You should message me if...",
  "Together we could...",

  // Personality reveals
  "I'm at my best when someone...",
  "My friends would say I'm...",
  "The hill I'll die on is...",
  "I'm weirdly attracted to...",

  // Fun & quirky
  "Don't be boring, be...",
  "I'll try anything once, especially...",
  "My most controversial opinion...",
  "The way to my heart is...",

  // Interests & adventures
  "What I'm curious about exploring...",
  "The thing I haven't tried yet but will...",
  "My happy place is...",
  "On a Sunday you'll find me...",

  // Connection style
  "The vibe that pulls me in is...",
  "I feel most connected when...",
  "What I bring to the table...",
  "Let's skip small talk and...",
];

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuthStore();
  const {
    balance,
    bonusLikes,
    subscription,
    isLowCredits,
    loadCredits,
    loadSubscription,
  } = useCreditsStore();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [creditsExpanded, setCreditsExpanded] = useState(false);
  const [editField, setEditField] = useState<'name' | 'bio'>('name');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Prompts state
  const [promptModalVisible, setPromptModalVisible] = useState(false);
  const [selectPromptModalVisible, setSelectPromptModalVisible] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<ProfilePrompt | null>(null);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
  const [promptAnswer, setPromptAnswer] = useState('');
  const [savingPrompts, setSavingPrompts] = useState(false);

  // Photos state
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  // Referral state
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralStats, setReferralStats] = useState<{ total_referrals: number; premium_days_earned: number } | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);

  // Profile quality tips
  const getProfileTips = () => {
    const tips: { id: string; text: string; action: () => void; priority: number }[] = [];

    // Check photos - most important
    if (!photos || photos.length === 0) {
      tips.push({
        id: 'no_photos',
        text: 'Add photos to get 10x more matches',
        action: () => {/* PhotoGrid handles this */},
        priority: 1,
      });
    } else if (photos.length < 3) {
      tips.push({
        id: 'few_photos',
        text: `Add ${3 - photos.length} more photo${3 - photos.length > 1 ? 's' : ''} to get 3x more likes`,
        action: () => {/* PhotoGrid handles this */},
        priority: 2,
      });
    }

    // Check bio
    if (!user?.bio || user.bio.length < 20) {
      tips.push({
        id: 'no_bio',
        text: 'Write a bio - profiles with bios get 2x more matches',
        action: () => openEditModal('bio'),
        priority: 3,
      });
    }

    // Check prompts
    if (!user?.prompts || user.prompts.length === 0) {
      tips.push({
        id: 'no_prompts',
        text: 'Add prompts to show your personality',
        action: openPromptSelector,
        priority: 4,
      });
    }

    // Check looking_for
    if (!user?.looking_for) {
      tips.push({
        id: 'no_looking_for',
        text: 'Set what you\'re looking for to find better matches',
        action: () => router.push('/settings'),
        priority: 5,
      });
    }

    // Sort by priority and return top 2
    return tips.sort((a, b) => a.priority - b.priority).slice(0, 2);
  };

  const profileTips = getProfileTips();

  const loadReferralData = async () => {
    try {
      setLoadingReferral(true);
      const [codeRes, statsRes] = await Promise.all([
        referralApi.getCode(),
        referralApi.getStats(),
      ]);
      setReferralCode(codeRes.data.code);
      setReferralStats({
        total_referrals: statsRes.data.total_referrals,
        premium_days_earned: statsRes.data.premium_days_earned,
      });
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoadingReferral(false);
    }
  };

  const handleShareProfile = async () => {
    try {
      const response = await profileApi.getShareLink();
      const { url, title, text } = response.data;

      await Share.share({
        message: `${text}\n\n${url}`,
        title: title,
        url: url, // iOS only
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        Alert.alert('Error', 'Failed to share profile');
      }
    }
  };

  const handleShareReferral = async () => {
    if (!referralCode) return;

    try {
      await Share.share({
        message: `Join me on feels - the dating app that puts real connections first! Use my code ${referralCode} to get 3 days of premium free.\n\nhttps://feelsfun.app/invite/${referralCode}`,
        title: 'Invite friends to feels',
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
      }
    }
  };

  const loadPhotos = async () => {
    try {
      const response = await profileApi.get();
      const profile = response.data?.profile;
      const profilePhotos = profile?.photos || [];
      setPhotos(profilePhotos);

      // Merge profile data into user state
      if (profile && user) {
        const updatedUser = {
          ...user,
          name: profile.name ?? user.name,
          bio: profile.bio ?? user.bio,
          prompts: profile.prompts ?? user.prompts,
          looking_for: profile.looking_for ?? user.looking_for,
          age: profile.age ?? user.age,
        };
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    loadCredits();
    loadSubscription();
    loadPhotos();
    loadReferralData();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const openEditModal = (field: 'name' | 'bio') => {
    setEditField(field);
    setEditValue(field === 'name' ? (user?.name || '') : (user?.bio || ''));
    setEditModalVisible(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!editValue.trim()) {
      Alert.alert('Error', `${editField === 'name' ? 'Name' : 'Bio'} cannot be empty`);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.put('/profile', { [editField]: editValue.trim() });
      setUser({ ...user!, [editField]: editValue.trim() });
      setSaveSuccess(true);
      setTimeout(() => {
        setEditModalVisible(false);
        setSaveSuccess(false);
      }, 500);
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Prompts functions
  const openPromptEditor = (prompt: ProfilePrompt, index: number) => {
    setEditingPrompt(prompt);
    setEditingPromptIndex(index);
    setPromptAnswer(prompt.answer);
    setPromptModalVisible(true);
  };

  const openPromptSelector = () => {
    setSelectPromptModalVisible(true);
  };

  const selectPrompt = (question: string) => {
    const prompts = user?.prompts || [];
    if (prompts.length >= 3) {
      Alert.alert('Limit reached', 'You can only have up to 3 prompts');
      return;
    }

    const newPrompt = { question, answer: '' };
    const newIndex = prompts.length;

    setEditingPrompt(newPrompt);
    setEditingPromptIndex(newIndex);
    setPromptAnswer('');
    setSelectPromptModalVisible(false);
    setPromptModalVisible(true);
  };

  const savePrompt = async () => {
    if (!promptAnswer.trim()) {
      Alert.alert('Error', 'Please write an answer for this prompt');
      return;
    }

    setSavingPrompts(true);
    try {
      const currentPrompts = user?.prompts || [];
      let updatedPrompts: ProfilePrompt[];

      if (editingPromptIndex !== null && editingPromptIndex < currentPrompts.length) {
        updatedPrompts = [...currentPrompts];
        updatedPrompts[editingPromptIndex] = {
          question: editingPrompt!.question,
          answer: promptAnswer.trim()
        };
      } else {
        updatedPrompts = [...currentPrompts, {
          question: editingPrompt!.question,
          answer: promptAnswer.trim()
        }];
      }

      await profileApi.update({ prompts: updatedPrompts });
      setUser({ ...user!, prompts: updatedPrompts });
      setPromptModalVisible(false);
      setEditingPrompt(null);
      setEditingPromptIndex(null);
      setPromptAnswer('');
    } catch (error: any) {
      console.error('Save prompt error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save prompt. Please try again.');
    } finally {
      setSavingPrompts(false);
    }
  };

  const deletePrompt = async (index: number) => {
    Alert.alert(
      'Remove Prompt',
      'Are you sure you want to remove this prompt?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setSavingPrompts(true);
            try {
              const currentPrompts = user?.prompts || [];
              const updatedPrompts = currentPrompts.filter((_, i) => i !== index);
              await profileApi.update({ prompts: updatedPrompts });
              setUser({ ...user!, prompts: updatedPrompts });
            } catch (error: any) {
              console.error('Delete prompt error:', error);
              Alert.alert('Error', 'Failed to remove prompt. Please try again.');
            } finally {
              setSavingPrompts(false);
            }
          },
        },
      ]
    );
  };

  const availablePrompts = AVAILABLE_PROMPTS.filter(
    p => !(user?.prompts || []).some(up => up.question === p)
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.headerButton} onPress={handleShareProfile}>
              <ShareIcon size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/settings')}>
              <SettingsIcon size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user?.photos?.[0] ? (
              <Image
                source={{ uri: user.photos[0] }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <UserIcon size={48} color={colors.text.tertiary} />
              </View>
            )}
            <TouchableOpacity style={styles.editBadge}>
              <EditIcon size={14} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => openEditModal('name')} style={styles.nameRow}>
            <Text style={styles.name}>
              {user?.name || 'Tap to add name'}
              {user?.age && `, ${user.age}`}
            </Text>
            {user?.is_verified && (
              <View style={styles.verifiedBadge}>
                <CheckIcon size={12} color={colors.text.primary} />
              </View>
            )}
          </TouchableOpacity>
          {user?.location && (
            <View style={styles.locationRow}>
              <MapPinIcon size={14} color={colors.text.secondary} />
              <Text style={styles.location}>{user.location}</Text>
            </View>
          )}
        </View>

        {/* Profile Quality Tips */}
        {profileTips.length > 0 && (
          <View style={styles.tipsContainer}>
            {profileTips.map((tip) => (
              <TouchableOpacity
                key={tip.id}
                style={styles.tipCard}
                onPress={tip.action}
                activeOpacity={0.8}
              >
                <View style={styles.tipIcon}>
                  <SparklesIcon size={16} color={colors.secondary.DEFAULT} />
                </View>
                <Text style={styles.tipText}>{tip.text}</Text>
                <ChevronRightIcon size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Credits Card */}
        <TouchableOpacity
          style={styles.creditsCard}
          onPress={() => setCreditsExpanded(!creditsExpanded)}
          activeOpacity={0.8}
        >
          <View style={styles.creditsHeader}>
            <View style={styles.creditsMainRow}>
              <View style={styles.creditsItem}>
                <CoinIcon size={22} color={colors.secondary.DEFAULT} />
                <View>
                  <Text style={styles.creditsValue}>{balance}</Text>
                  <Text style={styles.creditsLabel}>Credits</Text>
                </View>
                {isLowCredits() && (
                  <View style={styles.lowCreditsIndicator}>
                    <Text style={styles.lowCreditsText}>Low</Text>
                  </View>
                )}
              </View>

              <View style={styles.creditsDivider} />

              <View style={styles.creditsItem}>
                <HeartFilledIcon size={22} color={colors.primary.DEFAULT} />
                <View>
                  <Text style={styles.creditsValue}>{bonusLikes}</Text>
                  <Text style={styles.creditsLabel}>Bonus Likes</Text>
                </View>
              </View>

              {subscription && subscription.status === 'active' && (
                <>
                  <View style={styles.creditsDivider} />
                  <View style={styles.creditsItem}>
                    <CrownIcon size={22} color={colors.secondary.light} />
                    <View>
                      <Text style={styles.creditsValuePremium}>
                        {subscription.tier.charAt(0).toUpperCase() +
                          subscription.tier.slice(1)}
                      </Text>
                      <Text style={styles.creditsLabel}>Active</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {creditsExpanded ? (
              <ChevronUpIcon size={18} color={colors.text.tertiary} />
            ) : (
              <ChevronDownIcon size={18} color={colors.text.tertiary} />
            )}
          </View>

          {creditsExpanded && (
            <View style={styles.creditsBreakdown}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Super Likes cost</Text>
                <Text style={styles.breakdownValue}>5 credits each</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Daily bonus</Text>
                <Text style={styles.breakdownValue}>+10 credits</Text>
              </View>
              {subscription && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Subscription</Text>
                  <Text style={styles.breakdownValue}>
                    Renews{' '}
                    {new Date(subscription.expiresAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.getMoreButton}
                onPress={() => {
                  setCreditsExpanded(false);
                  setPremiumModalVisible(true);
                }}
              >
                <Text style={styles.getMoreText}>Get More Credits</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {/* Photo Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.photoHint}>{photos.length}/6</Text>
          </View>
          {loadingPhotos ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.primary.DEFAULT} />
            </View>
          ) : (
            <PhotoGrid
              photos={photos}
              onPhotosChange={(updatedPhotos) => {
                setPhotos(updatedPhotos);
                // Also update user photos in authStore for avatar
                if (user) {
                  setUser({
                    ...user,
                    photos: updatedPhotos.map((p) => p.url),
                  });
                }
              }}
              maxPhotos={5}
            />
          )}
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>About Me</Text>
            <TouchableOpacity onPress={() => openEditModal('bio')}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.bioCard} onPress={() => openEditModal('bio')}>
            {user?.bio ? (
              <Text style={styles.bioText}>{user.bio}</Text>
            ) : (
              <Text style={styles.bioPlaceholder}>
                Tap to add a bio...
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Prompts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile Prompts</Text>
            {(user?.prompts?.length || 0) < 3 && (
              <TouchableOpacity onPress={openPromptSelector} style={styles.addButton}>
                <PlusIcon size={16} color={colors.primary.DEFAULT} />
                <Text style={styles.editText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {savingPrompts && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.primary.DEFAULT} />
            </View>
          )}

          {user?.prompts && user.prompts.length > 0 ? (
            user.prompts.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.promptCard}
                onPress={() => openPromptEditor(prompt, index)}
              >
                <View style={styles.promptHeader}>
                  <Text style={styles.promptQuestion}>{prompt.question}</Text>
                  <TouchableOpacity
                    onPress={() => deletePrompt(index)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <XIcon size={16} color={colors.text.tertiary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.promptAnswer}>{prompt.answer}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity style={styles.emptyPrompts} onPress={openPromptSelector}>
              <Text style={styles.emptyPromptsText}>
                Add prompts to show your personality
              </Text>
              <Text style={styles.emptyPromptsHint}>
                Tap "+ Add" to get started
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Filters - Most Important */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.searchFiltersButton}
            onPress={() => router.push('/settings')}
          >
            <View style={styles.searchFiltersContent}>
              <View style={styles.searchFiltersIcon}>
                <SlidersIcon size={22} color={colors.primary.DEFAULT} />
              </View>
              <View>
                <Text style={styles.searchFiltersTitle}>Search Filters</Text>
                <Text style={styles.searchFiltersSubtitle}>Age, gender, vibe level, distance</Text>
              </View>
            </View>
            <ChevronRightIcon size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/settings/notifications')}
          >
            <BellIcon size={20} color={colors.text.secondary} />
            <Text style={styles.actionText}>Notifications</Text>
            <ChevronRightIcon size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/settings/privacy')}
          >
            <ShieldIcon size={20} color={colors.text.secondary} />
            <Text style={styles.actionText}>Privacy</Text>
            <ChevronRightIcon size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setPremiumModalVisible(true)}
          >
            <CrownIcon size={20} color={colors.secondary.DEFAULT} />
            <Text style={styles.actionText}>Premium</Text>
            <ChevronRightIcon size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/settings/help')}
          >
            <HelpCircleIcon size={20} color={colors.text.secondary} />
            <Text style={styles.actionText}>Help & Support</Text>
            <ChevronRightIcon size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Invite Friends / Referral */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Invite Friends</Text>
          </View>

          <View style={styles.referralCard}>
            <View style={styles.referralIconContainer}>
              <GiftIcon size={28} color={colors.secondary.DEFAULT} />
            </View>
            <View style={styles.referralContent}>
              <Text style={styles.referralTitle}>Get 7 days of premium free</Text>
              <Text style={styles.referralSubtitle}>
                Share your code. Friends get 3 days, you get 7 when they sign up.
              </Text>

              {loadingReferral ? (
                <ActivityIndicator color={colors.primary.DEFAULT} style={{ marginTop: spacing.md }} />
              ) : (
                <>
                  <View style={styles.referralCodeRow}>
                    <Text style={styles.referralCode}>{referralCode || '...'}</Text>
                    <TouchableOpacity
                      style={styles.shareCodeButton}
                      onPress={handleShareReferral}
                    >
                      <ShareIcon size={16} color={colors.text.primary} />
                      <Text style={styles.shareCodeText}>Share</Text>
                    </TouchableOpacity>
                  </View>

                  {referralStats && referralStats.total_referrals > 0 && (
                    <View style={styles.referralStatsRow}>
                      <Text style={styles.referralStatsText}>
                        {referralStats.total_referrals} friend{referralStats.total_referrals !== 1 ? 's' : ''} joined
                        {referralStats.premium_days_earned > 0 && ` (+${referralStats.premium_days_earned} days earned)`}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <LogOutIcon size={20} color={colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Name/Bio Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} disabled={saving}>
                <Text style={[styles.modalCancel, saving && { opacity: 0.5 }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                Edit {editField === 'name' ? 'Name' : 'Bio'}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                ) : saveSuccess ? (
                  <Text style={styles.modalSaveSuccess}>Saved!</Text>
                ) : (
                  <Text style={styles.modalSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.modalInput,
                editField === 'bio' && styles.modalInputMultiline,
              ]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={editField === 'name' ? 'Your name' : 'Tell us about yourself...'}
              placeholderTextColor={colors.text.disabled}
              multiline={editField === 'bio'}
              numberOfLines={editField === 'bio' ? 4 : 1}
              autoFocus
              maxLength={editField === 'name' ? 50 : 500}
              editable={!saving}
            />

            <Text style={styles.charCount}>
              {editValue.length}/{editField === 'name' ? 50 : 500}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Select Prompt Modal */}
      <Modal
        visible={selectPromptModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectPromptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.promptSelectContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectPromptModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Choose a Prompt</Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView style={styles.promptList}>
              {availablePrompts.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={styles.promptSelectOption}
                  onPress={() => selectPrompt(prompt)}
                >
                  <Text style={styles.promptSelectText}>{prompt}</Text>
                  <PlusIcon size={22} color={colors.primary.DEFAULT} />
                </TouchableOpacity>
              ))}
              {availablePrompts.length === 0 && (
                <Text style={styles.noPromptsText}>
                  You've used all available prompts!
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Prompt Modal */}
      <Modal
        visible={promptModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPromptModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setPromptModalVisible(false)}
                disabled={savingPrompts}
              >
                <Text style={[styles.modalCancel, savingPrompts && { opacity: 0.5 }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Your Answer</Text>
              <TouchableOpacity onPress={savePrompt} disabled={savingPrompts}>
                {savingPrompts ? (
                  <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                ) : (
                  <Text style={styles.modalSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.promptEditQuestion}>{editingPrompt?.question}</Text>

            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              value={promptAnswer}
              onChangeText={setPromptAnswer}
              placeholder="Write your answer..."
              placeholderTextColor={colors.text.disabled}
              multiline
              numberOfLines={4}
              autoFocus
              maxLength={200}
              editable={!savingPrompts}
            />

            <Text style={styles.charCount}>
              {promptAnswer.length}/200
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Premium Modal */}
      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold as any,
    color: colors.text.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary.DEFAULT,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.bg.primary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.info,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  location: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  // Credits Card styles
  creditsCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creditsMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creditsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  creditsValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold as any,
    color: colors.text.primary,
  },
  creditsValuePremium: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.secondary.light,
  },
  creditsLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  creditsDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.lg,
  },
  lowCreditsIndicator: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: spacing.sm,
  },
  lowCreditsText: {
    fontSize: 10,
    fontWeight: typography.weights.bold as any,
    color: colors.error,
    textTransform: 'uppercase',
  },
  creditsBreakdown: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  breakdownLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  breakdownValue: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.semibold as any,
  },
  getMoreButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  getMoreText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  editText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary.DEFAULT,
  },
  photoHint: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoSlot: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
  },
  bioCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    minHeight: 80,
  },
  bioText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 24,
  },
  bioPlaceholder: {
    fontSize: typography.sizes.base,
    color: colors.text.disabled,
    fontStyle: 'italic',
  },
  // Prompts styles
  loadingOverlay: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  promptCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  promptQuestion: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
    color: colors.primary.DEFAULT,
    flex: 1,
  },
  promptAnswer: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 22,
  },
  emptyPrompts: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing['2xl'],
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
  },
  emptyPromptsText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptyPromptsHint: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  promptEditQuestion: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.primary.DEFAULT,
    marginBottom: spacing.lg,
  },
  promptList: {
    flex: 1,
  },
  promptSelectOption: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promptSelectText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    flex: 1,
  },
  promptSelectContent: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: 40,
    maxHeight: '70%',
    marginTop: 'auto',
  },
  noPromptsText: {
    fontSize: typography.sizes.base,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  searchFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary.muted,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  searchFiltersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  searchFiltersIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(232, 93, 117, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchFiltersTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  searchFiltersSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.primary.light,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  actionText: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.primary,
  },
  logoutButton: {
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  logoutText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.error,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalCancel: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  modalSave: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary.DEFAULT,
  },
  modalSaveSuccess: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.success,
  },
  modalInput: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  modalInputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  // Referral styles
  referralCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.secondary.muted,
  },
  referralIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(232, 176, 73, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralContent: {
    flex: 1,
  },
  referralTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  referralSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  referralCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  referralCode: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.extrabold as any,
    color: colors.secondary.DEFAULT,
    letterSpacing: 2,
  },
  shareCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  shareCodeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.primary,
  },
  referralStatsRow: {
    marginTop: spacing.sm,
  },
  referralStatsText: {
    fontSize: typography.sizes.sm,
    color: colors.success,
    fontWeight: typography.weights.medium as any,
  },
  // Profile Tips styles
  tipsContainer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 176, 73, 0.1)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(232, 176, 73, 0.3)',
    gap: spacing.sm,
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 176, 73, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.medium as any,
  },
});
