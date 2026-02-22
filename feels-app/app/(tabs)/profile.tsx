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
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { api, profileApi } from '@/api/client';
import PremiumModal from '@/components/PremiumModal';

interface ProfilePrompt {
  question: string;
  answer: string;
}

const AVAILABLE_PROMPTS = [
  "I'm done playing it safe, now I want...",
  "The energy I'm looking for is...",
  "I'll try anything once, especially...",
  "What I'm curious about exploring...",
  "The vibe that pulls me in is...",
  "I'm at my best when someone...",
  "Don't be boring, be...",
  "I know what I want, and it's...",
  "The thing I haven't tried yet but will...",
  "Green flags that make me say yes...",
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

  useEffect(() => {
    loadCredits();
    loadSubscription();
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
      // Show success briefly then close
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
        // Editing existing prompt
        updatedPrompts = [...currentPrompts];
        updatedPrompts[editingPromptIndex] = {
          question: editingPrompt!.question,
          answer: promptAnswer.trim()
        };
      } else {
        // Adding new prompt
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
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
            <Text style={styles.settingsEmoji}>&#9881;</Text>
          </TouchableOpacity>
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
                <Text style={styles.avatarEmoji}>&#128100;</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editBadge}>
              <Text style={styles.editEmoji}>&#9999;</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => openEditModal('name')}>
            <Text style={styles.name}>
              {user?.name || 'Tap to add name'}
              {user?.age && `, ${user.age}`}
            </Text>
          </TouchableOpacity>
          {user?.location && (
            <Text style={styles.location}>&#128205; {user.location}</Text>
          )}
        </View>

        {/* Credits Card */}
        <TouchableOpacity
          style={styles.creditsCard}
          onPress={() => setCreditsExpanded(!creditsExpanded)}
          activeOpacity={0.8}
        >
          <View style={styles.creditsHeader}>
            <View style={styles.creditsMainRow}>
              <View style={styles.creditsItem}>
                <Text style={styles.creditsEmoji}>&#129689;</Text>
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
                <Text style={styles.creditsEmoji}>&#128150;</Text>
                <View>
                  <Text style={styles.creditsValue}>{bonusLikes}</Text>
                  <Text style={styles.creditsLabel}>Bonus Likes</Text>
                </View>
              </View>

              {subscription && subscription.status === 'active' && (
                <>
                  <View style={styles.creditsDivider} />
                  <View style={styles.creditsItem}>
                    <Text style={styles.creditsEmoji}>&#128142;</Text>
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

            <Text style={styles.expandIcon}>
              {creditsExpanded ? '^' : 'v'}
            </Text>
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
            <TouchableOpacity>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.photoGrid}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <TouchableOpacity
                key={index}
                style={styles.photoSlot}
                activeOpacity={0.8}
              >
                {user?.photos?.[index] ? (
                  <Image
                    source={{ uri: user.photos[index] }}
                    style={styles.photo}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.addEmoji}>+</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
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
              <TouchableOpacity onPress={openPromptSelector}>
                <Text style={styles.editText}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {savingPrompts && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#FF1493" />
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
                    <Text style={styles.promptDelete}>X</Text>
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

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionEmoji}>&#128276;</Text>
            <Text style={styles.actionText}>Notifications</Text>
            <Text style={styles.actionArrow}>&#8250;</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionEmoji}>&#128274;</Text>
            <Text style={styles.actionText}>Privacy</Text>
            <Text style={styles.actionArrow}>&#8250;</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setPremiumModalVisible(true)}
          >
            <Text style={styles.actionEmoji}>&#128142;</Text>
            <Text style={styles.actionText}>Premium</Text>
            <Text style={styles.actionArrow}>&#8250;</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionEmoji}>?</Text>
            <Text style={styles.actionText}>Help & Support</Text>
            <Text style={styles.actionArrow}>&#8250;</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
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
                  <ActivityIndicator size="small" color="#FF1493" />
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
              placeholderTextColor="#666"
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
                  <Text style={styles.promptSelectAdd}>+</Text>
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
                  <ActivityIndicator size="small" color="#FF1493" />
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
              placeholderTextColor="#666"
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
        currentSubscription={subscription}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsEmoji: {
    fontSize: 20,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FF1493',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 48,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF1493',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000000',
  },
  editEmoji: {
    fontSize: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  location: {
    fontSize: 16,
    color: '#888888',
    marginTop: 4,
  },
  // Credits Card styles
  creditsCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222222',
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
    gap: 8,
  },
  creditsEmoji: {
    fontSize: 24,
  },
  creditsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  creditsValuePremium: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF1493',
  },
  creditsLabel: {
    fontSize: 12,
    color: '#888888',
  },
  creditsDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#333333',
    marginHorizontal: 16,
  },
  lowCreditsIndicator: {
    backgroundColor: 'rgba(255, 68, 88, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  lowCreditsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF4458',
    textTransform: 'uppercase',
  },
  expandIcon: {
    fontSize: 12,
    color: '#666666',
  },
  creditsBreakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#888888',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  getMoreButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  getMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF1493',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoSlot: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addEmoji: {
    fontSize: 24,
    opacity: 0.5,
    color: '#888888',
  },
  bioCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
  },
  bioText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  bioPlaceholder: {
    fontSize: 16,
    color: '#666666',
    fontStyle: 'italic',
  },
  // Prompts styles
  loadingOverlay: {
    padding: 20,
    alignItems: 'center',
  },
  promptCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  promptQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF1493',
    flex: 1,
  },
  promptDelete: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666666',
    paddingLeft: 12,
  },
  promptAnswer: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  emptyPrompts: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed',
  },
  emptyPromptsText: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 4,
  },
  emptyPromptsHint: {
    fontSize: 14,
    color: '#666666',
  },
  promptEditQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF1493',
    marginBottom: 16,
  },
  promptList: {
    flex: 1,
  },
  promptSelectOption: {
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promptSelectText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  promptSelectAdd: {
    fontSize: 24,
    color: '#FF1493',
    fontWeight: '700',
    marginLeft: 12,
  },
  promptSelectContent: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '70%',
    marginTop: 'auto',
  },
  noPromptsText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionArrow: {
    fontSize: 24,
    color: '#666666',
  },
  logoutButton: {
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 88, 0.1)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4458',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCancel: {
    fontSize: 16,
    color: '#888888',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF1493',
  },
  modalSaveSuccess: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00C853',
  },
  modalSaveDisabled: {
    opacity: 0.5,
  },
  modalInput: {
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalInputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
    marginTop: 8,
  },
});
