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
import { HeartFilledIcon, MessageIcon } from '@/components/Icons';
import { colors, typography, borderRadius, spacing, shadows } from '@/constants/theme';

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
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        {matches.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{matches.length}</Text>
            <HeartFilledIcon size={14} color={colors.primary.DEFAULT} />
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
            tintColor={colors.primary.DEFAULT}
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
          <Text style={styles.sectionTitle}>Conversations</Text>
          {conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <MessageIcon size={32} color={colors.text.tertiary} />
              </View>
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
    backgroundColor: colors.bg.primary,
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold as any,
    color: colors.text.primary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  badgeText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  newMatchesContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
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
    borderColor: colors.primary.DEFAULT,
  },
  newBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.bg.primary,
  },
  newMatchName: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    paddingHorizontal: spacing['4xl'],
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  messageAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  messageName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  messageTime: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
  messagePreview: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
});
