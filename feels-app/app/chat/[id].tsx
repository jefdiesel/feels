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
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchesApi, api } from '@/api/client';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useCrypto } from '@/hooks/useCrypto';
import { useAuthStore } from '@/stores/authStore';

interface Message {
  id: string;
  content: string;
  encrypted_content?: string;
  is_mine: boolean;
  created_at: string;
  sender_id: string;
}

interface MatchDetails {
  id: string;
  user: {
    id: string;
    name: string;
    photo: string;
  };
  image_permission: boolean;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState('');
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [otherUserPublicKey, setOtherUserPublicKey] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();
  const { getPublicKey, uploadPublicKey } = useAuthStore();
  const {
    generateKeyPair,
    getStoredPublicKey,
    encryptMessage,
    decryptMessage,
    hasKeyPair,
    isCryptoAvailable,
  } = useCrypto();

  // Initialize encryption keys
  useEffect(() => {
    const initEncryption = async () => {
      if (!isCryptoAvailable()) {
        console.log('WebCrypto not available, encryption disabled');
        return;
      }

      try {
        // Check if we have a key pair, generate if not
        const hasKeys = await hasKeyPair();
        let publicKey: string | null = null;

        if (!hasKeys) {
          publicKey = await generateKeyPair();
          // Upload public key to server
          await uploadPublicKey(publicKey);
        } else {
          publicKey = await getStoredPublicKey();
        }

        setEncryptionReady(true);
      } catch (error) {
        console.error('Failed to initialize encryption:', error);
      }
    };

    initEncryption();
  }, []);

  const { data: match } = useQuery({
    queryKey: ['match', id],
    queryFn: async () => {
      // In real app, fetch match details
      const response = await api.get(`/matches/${id}`);
      return response.data as MatchDetails;
    },
  });

  // Fetch other user's public key
  useEffect(() => {
    const fetchOtherUserKey = async () => {
      if (match?.user?.id) {
        const key = await getPublicKey(match.user.id);
        setOtherUserPublicKey(key);
      }
    };
    fetchOtherUserKey();
  }, [match?.user?.id, getPublicKey]);

  // Decrypt messages helper
  const decryptMessages = useCallback(async (msgs: Message[]): Promise<Message[]> => {
    if (!otherUserPublicKey || !encryptionReady) {
      return msgs;
    }

    const decryptedMsgs = await Promise.all(
      msgs.map(async (msg) => {
        if (msg.encrypted_content && !msg.is_mine) {
          try {
            const decryptedContent = await decryptMessage(otherUserPublicKey, msg.encrypted_content);
            return { ...msg, content: decryptedContent };
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            return { ...msg, content: '[Unable to decrypt message]' };
          }
        }
        return msg;
      })
    );

    return decryptedMsgs;
  }, [otherUserPublicKey, encryptionReady, decryptMessage]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', id, otherUserPublicKey],
    queryFn: async () => {
      const response = await matchesApi.getMessages(id!);
      const msgs = response.data as Message[];
      // Decrypt messages if encryption is available
      return decryptMessages(msgs);
    },
    enabled: !!id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      // Encrypt message if encryption is available
      if (encryptionReady && otherUserPublicKey) {
        try {
          const encryptedContent = await encryptMessage(otherUserPublicKey, content);
          return api.post(`/matches/${id}/messages`, {
            content: content, // Also send plaintext for now (server can choose to store either)
            encrypted_content: encryptedContent,
          });
        } catch (error) {
          console.error('Encryption failed, sending unencrypted:', error);
        }
      }
      return matchesApi.sendMessage(id!, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
    },
  });

  // WebSocket for real-time messages
  useWebSocket({
    onMessage: (data) => {
      if (data.type === 'new_message' && data.match_id === id) {
        queryClient.invalidateQueries({ queryKey: ['messages', id] });
      }
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
    setMessage('');
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
      ]}
    >
      <Text style={styles.messageText}>{item.content}</Text>
      <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileInfo}>
          {match?.user.photo && (
            <Image
              source={{ uri: match.user.photo }}
              style={styles.headerAvatar}
              contentFit="cover"
            />
          )}
          <Text style={styles.headerName}>{match?.user.name || 'Chat'}</Text>
        </TouchableOpacity>

        <View style={styles.statusIcons}>
          {encryptionReady && otherUserPublicKey && (
            <View style={styles.encryptionBadge}>
              <Text style={styles.encryptionBadgeText}>E2E</Text>
            </View>
          )}
          <TouchableOpacity style={styles.imageToggle}>
            <Text style={styles.imageToggleEmoji}>
              {match?.image_permission ? '📷' : '🔒'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          inverted
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#666666"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !message.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!message.trim()}
          >
            <Text style={styles.sendEmoji}>📤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  encryptionBadge: {
    backgroundColor: '#00AA00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  encryptionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  imageToggle: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageToggleEmoji: {
    fontSize: 24,
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    flexDirection: 'column-reverse',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF1493',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#222222',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  input: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 120,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF1493',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#333333',
  },
  sendEmoji: {
    fontSize: 20,
  },
});
