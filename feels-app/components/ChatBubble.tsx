import { View, Text, StyleSheet } from 'react-native';

interface ChatBubbleProps {
  content: string;
  isMine: boolean;
  time: string;
}

export default function ChatBubble({ content, isMine, time }: ChatBubbleProps) {
  return (
    <View style={[styles.container, isMine ? styles.mine : styles.theirs]}>
      <Text style={styles.content}>{content}</Text>
      <Text style={styles.time}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF1493',
    borderBottomRightRadius: 4,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#222222',
    borderBottomLeftRadius: 4,
  },
  content: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  time: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});
