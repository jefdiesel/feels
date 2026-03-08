import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchesApi, safetyApi, api } from '@/api/client';
import { useWebSocket } from '@/hooks/useWebSocket';
// import { useCrypto } from '@/hooks/useCrypto';  // Disabled - causing crashes
import { useAuthStore } from '@/stores/authStore';
import {
  ArrowLeftIcon,
  LockIcon,
  CameraIcon,
  SendIcon,
  ShieldIcon,
  MoreVerticalIcon,
  UserXIcon,
  SlashIcon,
  FlagIcon,
  XIcon,
  CheckIcon,
  CheckCheckIcon,
} from '@/components/Icons';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

interface Message {
  id: string;
  content?: string;
  encrypted_content?: string;
  image_url?: string;
  is_mine: boolean;
  created_at: string;
  sender_id: string;
  read_at?: string;
}

interface ImageStatus {
  you_enabled: boolean;
  they_enabled: boolean;
  both_enabled: boolean;
}

interface MessagesResponse {
  messages: Message[];
  has_more: boolean;
  image_status: ImageStatus;
}

interface MatchDetails {
  id: string;
  other_user: {
    user_id: string;
    name: string;
    photos?: { url: string }[];
  };
  image_enabled: boolean;
}

const REPORT_REASONS = [
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'fake', label: 'Fake profile' },
  { value: 'underage', label: 'Underage user' },
  { value: 'other', label: 'Other' },
];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [imageStatus, setImageStatus] = useState<ImageStatus>({
    you_enabled: false,
    they_enabled: false,
    both_enabled: false,
  });
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();
  const { user, getPublicKey, uploadPublicKey } = useAuthStore();
  // Crypto disabled for now - was causing crashes
  const encryptionReady = false;
  const otherUserPublicKey = null as string | null;

  // Encryption disabled for now

  const { data: match, isLoading: matchLoading, error: matchError } = useQuery({
    queryKey: ['match', id],
    queryFn: async () => {
      const response = await matchesApi.getMatch(id!);
      return response.data as MatchDetails;
    },
    enabled: !!id,
  });

  // Encryption disabled for now

  // Decrypt messages helper (encryption disabled)
  const decryptMessages = useCallback(async (msgs: Message[]): Promise<Message[]> => {
    return msgs;
  }, []);

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: async () => {
      const response = await matchesApi.getMessages(id!);
      const data = response.data as MessagesResponse;
      // Update image status from response
      if (data.image_status) {
        setImageStatus(data.image_status);
      }
      // Add is_mine based on sender_id comparison
      // Sort by created_at descending (newest first) for inverted FlatList
      const messagesWithIsMine = (data.messages || [])
        .map((msg: any) => ({
          ...msg,
          is_mine: msg.sender_id === user?.id,
        }))
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return { ...data, messages: messagesWithIsMine };
    },
    enabled: !!id && !!user?.id,
  });

  const messages = messagesData?.messages || [];

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return matchesApi.sendMessage(id!, content);
    },
    onMutate: async (content: string) => {
      // Optimistic update - add message immediately
      await queryClient.cancelQueries({ queryKey: ['messages', id] });
      const previousMessages = queryClient.getQueryData(['messages', id]);

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        content,
        is_mine: true,
        created_at: new Date().toISOString(),
        sender_id: user?.id || '',
      };

      queryClient.setQueryData(['messages', id], (old: any) => ({
        ...old,
        messages: [optimisticMessage, ...(old?.messages || [])],
      }));

      return { previousMessages };
    },
    onError: (_err, _content, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', id], context.previousMessages);
      }
    },
    onSettled: () => {
      // Refetch to get the real message with correct ID
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
    },
  });

  // Image permission mutations
  const enableImagesMutation = useMutation({
    mutationFn: () => matchesApi.enableImages(id!),
    onSuccess: () => {
      setImageStatus((prev) => ({ ...prev, you_enabled: true, both_enabled: prev.they_enabled }));
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to enable images';
      if (message.includes('5 messages')) {
        Alert.alert('Not Yet', 'Exchange at least 5 messages before enabling image sharing.');
      } else {
        Alert.alert('Error', message);
      }
    },
  });

  const disableImagesMutation = useMutation({
    mutationFn: () => matchesApi.disableImages(id!),
    onSuccess: () => {
      setImageStatus((prev) => ({ ...prev, you_enabled: false, both_enabled: false }));
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
    },
  });

  // Safety mutations
  const unmatchMutation = useMutation({
    mutationFn: () => matchesApi.unmatch(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      router.back();
    },
  });

  const blockMutation = useMutation({
    mutationFn: () => safetyApi.block(match?.other_user.user_id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      router.back();
    },
  });

  const reportMutation = useMutation({
    mutationFn: () => safetyApi.report(match?.other_user.user_id!, selectedReportReason!, reportDetails || undefined),
    onSuccess: () => {
      setReportModalVisible(false);
      Alert.alert('Report Submitted', 'Thank you for helping keep Feels safe.');
    },
  });

  // WebSocket for real-time messages
  useWebSocket({
    onMessage: (data) => {
      console.log('[WS] Received:', data.type, data.payload?.message?.match_id, 'expected:', id);
      if (data.type === 'new_message' && String(data.payload?.message?.match_id) === id) {
        // Directly add the new message to the cache for instant display
        const newMsg = data.payload.message;
        queryClient.setQueryData(['messages', id], (old: any) => {
          if (!old?.messages) return old;
          // Check if message already exists
          if (old.messages.some((m: Message) => m.id === newMsg.id)) {
            return old;
          }
          return {
            ...old,
            messages: [{ ...newMsg, is_mine: newMsg.sender_id === user?.id }, ...old.messages],
          };
        });
      }
      if (data.type === 'message_read' && String(data.payload?.match_id) === id) {
        // Mark all sent messages as read
        queryClient.setQueryData(['messages', id], (old: any) => {
          if (!old?.messages) return old;
          return {
            ...old,
            messages: old.messages.map((msg: Message) =>
              msg.is_mine && !msg.read_at
                ? { ...msg, read_at: new Date().toISOString() }
                : msg
            ),
          };
        });
      }
      if (data.type === 'typing_start' && String(data.payload?.match_id) === id) {
        setOtherUserTyping(true);
      }
      if (data.type === 'typing_stop' && String(data.payload?.match_id) === id) {
        setOtherUserTyping(false);
      }
      if ((data.type === 'image_enabled' || data.type === 'image_disabled') && String(data.payload?.match_id) === id) {
        const enabled = data.type === 'image_enabled';
        setImageStatus((prev) => ({
          ...prev,
          they_enabled: enabled,
          both_enabled: prev.you_enabled && enabled,
        }));
      }
    },
  });

  // Typing indicator logic
  const sendTypingIndicator = useCallback(async (typing: boolean) => {
    try {
      await matchesApi.sendTyping(id!, typing);
    } catch (error) {
      // Silently fail - typing indicators are not critical
    }
  }, [id]);

  const handleTextChange = (text: string) => {
    setMessage(text);

    // Send typing start if not already typing
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        sendTypingIndicator(false);
      }
    }, 2000);
  };

  const handleSend = () => {
    if (!message.trim()) return;

    // Clear typing state
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTyping) {
      setIsTyping(false);
      sendTypingIndicator(false);
    }

    sendMessageMutation.mutate(message);
    setMessage('');
  };

  const handlePickImage = () => {
    Alert.alert(
      'Send Image',
      'Choose image source',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera permission is required to take photos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              uploadAndSendImage(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Photo library permission is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              uploadAndSendImage(result.assets[0].uri);
            }
          },
        },
      ]
    );
  };

  const uploadAndSendImage = async (uri: string) => {
    try {
      // Upload to backend
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri,
        name: filename,
        type,
      } as any);

      const response = await matchesApi.uploadImage(id!, formData);
      if (response.data?.url) {
        // Send message with image URL
        await matchesApi.sendMessage(id!, undefined, response.data.url);
        queryClient.invalidateQueries({ queryKey: ['messages', id] });
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send image');
    }
  };

  const handleImageToggle = () => {
    if (imageStatus.you_enabled) {
      Alert.alert(
        'Disable Image Sharing',
        'You will no longer be able to send or receive images in this chat.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disable', style: 'destructive', onPress: () => disableImagesMutation.mutate() },
        ]
      );
    } else {
      Alert.alert(
        'Enable Image Sharing',
        'Both you and your match must enable this to share images.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: () => enableImagesMutation.mutate() },
        ]
      );
    }
  };

  const handleUnmatch = () => {
    setMenuVisible(false);
    Alert.alert(
      'Unmatch',
      `Are you sure you want to unmatch with ${match?.other_user.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unmatch', style: 'destructive', onPress: () => unmatchMutation.mutate() },
      ]
    );
  };

  const handleBlock = () => {
    setMenuVisible(false);
    Alert.alert(
      'Block User',
      `Block ${match?.other_user.name}? They won't be able to see your profile or message you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => blockMutation.mutate() },
      ]
    );
  };

  const handleReport = () => {
    setMenuVisible(false);
    setReportModalVisible(true);
  };

  const submitReport = () => {
    if (!selectedReportReason) {
      Alert.alert('Select a Reason', 'Please select a reason for your report.');
      return;
    }
    reportMutation.mutate();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.is_mine ? styles.myMessage : styles.theirMessage,
        item.image_url && styles.imageBubble,
      ]}
    >
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={styles.messageImage}
          contentFit="cover"
        />
      ) : (
        <Text style={styles.messageText}>{item.content}</Text>
      )}
      <View style={styles.messageFooter}>
        <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
        {item.is_mine && (
          <View style={styles.readReceipt}>
            {item.read_at ? (
              <CheckCheckIcon size={14} color={colors.primary.light} />
            ) : (
              <CheckIcon size={14} color="rgba(255,255,255,0.5)" />
            )}
          </View>
        )}
      </View>
    </View>
  );

  const getImagePermissionIcon = () => {
    if (imageStatus.both_enabled) {
      return <CameraIcon size={22} color={colors.success} />;
    }
    if (imageStatus.you_enabled) {
      return <CameraIcon size={22} color={colors.secondary.DEFAULT} />;
    }
    return <LockIcon size={22} color={colors.text.tertiary} />;
  };

  // Show loading state
  if (matchLoading || isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerName}>Loading...</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (matchError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerName}>Error</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: colors.error, textAlign: 'center' }}>
            Failed to load chat. Please try again.
          </Text>
          <TouchableOpacity
            style={{ marginTop: 16, padding: 12, backgroundColor: colors.primary.DEFAULT, borderRadius: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: colors.text.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeftIcon size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profileInfo}
          onPress={() => setProfileModalVisible(true)}
        >
          {match?.other_user.photos?.[0]?.url && (
            <Image
              source={{ uri: match.other_user.photos?.[0]?.url }}
              style={styles.headerAvatar}
              contentFit="cover"
            />
          )}
          <View>
            <Text style={styles.headerName}>{match?.other_user.name || 'Chat'}</Text>
            {otherUserTyping && (
              <Text style={styles.typingIndicator}>typing...</Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.statusIcons}>
          {encryptionReady && otherUserPublicKey && (
            <View style={styles.encryptionBadge}>
              <ShieldIcon size={12} color={colors.text.primary} />
              <Text style={styles.encryptionBadgeText}>E2E</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.imageToggle}
            onPress={handleImageToggle}
          >
            {getImagePermissionIcon()}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
          >
            <MoreVerticalIcon size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          inverted
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          {imageStatus.both_enabled && (
            <TouchableOpacity
              style={styles.imageButton}
              onPress={handlePickImage}
            >
              <CameraIcon size={24} color={colors.primary.DEFAULT} />
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.text.disabled}
            value={message}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
            autoComplete="off"
            autoCorrect={true}
            textContentType="none"
            importantForAutofill="no"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !message.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!message.trim()}
          >
            <SendIcon size={20} color={message.trim() ? colors.text.primary : colors.text.disabled} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContent}>
            <TouchableOpacity style={styles.menuItem} onPress={handleUnmatch}>
              <UserXIcon size={20} color={colors.text.secondary} />
              <Text style={styles.menuText}>Unmatch</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
              <SlashIcon size={20} color={colors.text.secondary} />
              <Text style={styles.menuText}>Block</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
              <FlagIcon size={20} color={colors.error} />
              <Text style={[styles.menuText, { color: colors.error }]}>Report</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Profile Modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalContent}>
            <TouchableOpacity
              style={styles.profileModalClose}
              onPress={() => setProfileModalVisible(false)}
            >
              <XIcon size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            {match?.other_user.photos?.[0]?.url && (
              <Image
                source={{ uri: match.other_user.photos[0].url }}
                style={styles.profileModalPhoto}
                contentFit="cover"
              />
            )}

            <Text style={styles.profileModalName}>{match?.other_user.name}</Text>

            {/* Show more photos if available */}
            {match?.other_user.photos && match.other_user.photos.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profileModalPhotos}>
                {match.other_user.photos.slice(1).map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: photo.url }}
                    style={styles.profileModalThumb}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.reportOverlay}>
          <View style={styles.reportContent}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>Report {match?.other_user.name}</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <XIcon size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.reportSubtitle}>Why are you reporting this user?</Text>

            <ScrollView style={styles.reportReasons}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonItem,
                    selectedReportReason === reason.value && styles.reasonItemSelected,
                  ]}
                  onPress={() => setSelectedReportReason(reason.value)}
                >
                  <Text
                    style={[
                      styles.reasonText,
                      selectedReportReason === reason.value && styles.reasonTextSelected,
                    ]}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.reportInput}
              placeholder="Additional details (optional)"
              placeholderTextColor={colors.text.disabled}
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.reportButton, reportMutation.isPending && styles.reportButtonDisabled]}
              onPress={submitReport}
              disabled={reportMutation.isPending}
            >
              {reportMutation.isPending ? (
                <ActivityIndicator color={colors.text.primary} />
              ) : (
                <Text style={styles.reportButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.bg.secondary,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  typingIndicator: {
    fontSize: typography.sizes.xs,
    color: colors.primary.DEFAULT,
    fontStyle: 'italic',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  encryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  encryptionBadgeText: {
    color: colors.text.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
  },
  imageToggle: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary.DEFAULT,
    borderBottomRightRadius: spacing.xs,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.tertiary,
    borderBottomLeftRadius: spacing.xs,
  },
  messageText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  messageTime: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  readReceipt: {
    marginLeft: 2,
  },
  imageBubble: {
    padding: spacing.xs,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.lg,
  },
  imageButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.bg.secondary,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius['2xl'],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    maxHeight: 120,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.bg.tertiary,
  },
  // Menu styles
  menuOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: spacing.lg,
  },
  menuContent: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    minWidth: 160,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  menuText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  // Report Modal styles
  reportOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  reportContent: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  reportTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  reportSubtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  reportReasons: {
    maxHeight: 250,
    marginBottom: spacing.lg,
  },
  reasonItem: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg.tertiary,
    marginBottom: spacing.sm,
  },
  reasonItemSelected: {
    backgroundColor: colors.primary.muted,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  reasonText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  reasonTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: typography.weights.semibold as any,
  },
  reportInput: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  reportButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  reportButtonDisabled: {
    opacity: 0.6,
  },
  reportButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  // Profile modal styles
  profileModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  profileModalContent: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  profileModalClose: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
    padding: spacing.sm,
  },
  profileModalPhoto: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: spacing.lg,
  },
  profileModalName: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  profileModalPhotos: {
    marginTop: spacing.md,
  },
  profileModalThumb: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
});
