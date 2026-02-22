import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesApi } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

// Backend response types
interface BackendPhoto {
  id: string;
  url: string;
  position: number;
}

interface BackendProfile {
  user_id: string;
  name: string;
  photos?: BackendPhoto[];
}

interface BackendMessagePreview {
  content: string;
  sender_id: string;
  created_at: string;
}

interface BackendMatch {
  id: string;
  other_user: BackendProfile;
  last_message?: BackendMessagePreview;
  unread_count: number;
  created_at: string;
}

// Transformed types for UI
interface Match {
  id: string;
  user: {
    id: string;
    name: string;
    photo: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    is_mine: boolean;
  };
  is_new: boolean;
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const { user } = useAuthStore();

  const transformMatches = useCallback((backendMatches: BackendMatch[]): Match[] => {
    return backendMatches.map((m) => ({
      id: m.id,
      user: {
        id: m.other_user.user_id,
        name: m.other_user.name,
        photo: m.other_user.photos?.[0]?.url || '',
      },
      last_message: m.last_message ? {
        content: m.last_message.content,
        created_at: m.last_message.created_at,
        is_mine: m.last_message.sender_id === user?.id,
      } : undefined,
      is_new: !m.last_message,
    }));
  }, [user?.id]);

  const fetchMatches = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    else setIsRefetching(true);

    try {
      const response = await matchesApi.getMatches();
      const transformed = transformMatches(response.data || []);
      setMatches(transformed);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [transformMatches]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const refetch = () => fetchMatches(false);

  const newMatches = matches?.filter((m) => m.is_new) || [];
  const conversations = matches?.filter((m) => !m.is_new && m.last_message) || [];

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const openChat = (matchId: string) => {
    router.push(`/chat/${matchId}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Matches</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
        {matches.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{matches.length}</Text>
            <Text style={styles.badgeEmoji}>❤️</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#FF1493"
          />
        }
      >
        {/* New Matches Section */}
        {newMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Matches</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.newMatchesContainer}
            >
              {newMatches.map((match) => (
                <TouchableOpacity
                  key={match.id}
                  style={styles.newMatchCard}
                  onPress={() => openChat(match.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.newMatchImageWrapper}>
                    <Image
                      source={{ uri: match.user.photo }}
                      style={styles.newMatchImage}
                      contentFit="cover"
                    />
                    <View style={styles.newBadge} />
                  </View>
                  <Text style={styles.newMatchName} numberOfLines={1}>
                    {match.user.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Messages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Messages</Text>
          {conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>
                No messages yet. Start a conversation!
              </Text>
            </View>
          ) : (
            conversations.map((match) => (
              <TouchableOpacity
                key={match.id}
                style={styles.messageCard}
                onPress={() => openChat(match.id)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: match.user.photo }}
                  style={styles.messageAvatar}
                  contentFit="cover"
                />
                <View style={styles.messageContent}>
                  <View style={styles.messageHeader}>
                    <Text style={styles.messageName}>{match.user.name}</Text>
                    <Text style={styles.messageTime}>
                      {formatTime(match.last_message!.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.messagePreview} numberOfLines={1}>
                    {match.last_message!.is_mine && 'You: '}
                    {match.last_message!.content}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badgeEmoji: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  newMatchesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  newMatchCard: {
    alignItems: 'center',
    width: 80,
  },
  newMatchImageWrapper: {
    position: 'relative',
  },
  newMatchImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#FF1493',
  },
  newBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00FF88',
    borderWidth: 2,
    borderColor: '#000000',
  },
  newMatchName: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  messageAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 12,
    color: '#888888',
  },
  messagePreview: {
    fontSize: 14,
    color: '#888888',
  },
});
