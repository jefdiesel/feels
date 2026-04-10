import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface MatchCardProps {
  name: string;
  photo: string;
  lastMessage?: string;
  time?: string;
  isNew?: boolean;
  onPress: () => void;
}

export default function MatchCard({
  name,
  photo,
  lastMessage,
  time,
  isNew,
  onPress,
}: MatchCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" />
        {isNew && <View style={styles.newBadge} />}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {time && <Text style={styles.time}>{time}</Text>}
        </View>
        {lastMessage && (
          <Text style={styles.message} numberOfLines={1}>
            {lastMessage}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  newBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00FF88',
    borderWidth: 2,
    borderColor: '#000000',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#888888',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#888888',
  },
});
