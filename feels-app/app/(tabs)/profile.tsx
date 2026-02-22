import { useState } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/api/client';

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuthStore();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<'name' | 'bio'>('name');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

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
  };

  const handleSave = async () => {
    if (!editValue.trim()) {
      Alert.alert('Error', `${editField === 'name' ? 'Name' : 'Bio'} cannot be empty`);
      return;
    }

    setSaving(true);
    try {
      await api.put('/profile', { [editField]: editValue.trim() });
      setUser({ ...user!, [editField]: editValue.trim() });
      setEditModalVisible(false);
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsEmoji}>⚙️</Text>
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
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editBadge}>
              <Text style={styles.editEmoji}>✏️</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => openEditModal('name')}>
            <Text style={styles.name}>
              {user?.name || 'Tap to add name'}
              {user?.age && `, ${user.age}`}
            </Text>
          </TouchableOpacity>
          {user?.location && (
            <Text style={styles.location}>📍 {user.location}</Text>
          )}
        </View>

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
                    <Text style={styles.addEmoji}>➕</Text>
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

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionEmoji}>🔔</Text>
            <Text style={styles.actionText}>Notifications</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionEmoji}>🔒</Text>
            <Text style={styles.actionText}>Privacy</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionEmoji}>💎</Text>
            <Text style={styles.actionText}>Premium</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionEmoji}>❓</Text>
            <Text style={styles.actionText}>Help & Support</Text>
            <Text style={styles.actionArrow}>›</Text>
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

      {/* Edit Modal */}
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
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                Edit {editField === 'name' ? 'Name' : 'Bio'}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
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
            />

            <Text style={styles.charCount}>
              {editValue.length}/{editField === 'name' ? 50 : 500}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
