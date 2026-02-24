import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { darkTheme } from '../utils/theme';
import { Message } from '../utils/messageUtils';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble = ({ message }: ChatBubbleProps) => {
  if (!message || !message.text) return null;

  return (
    <View
      style={[
        styles.message,
        message.sender === 'user' ? styles.userMsg : styles.aiMsg,
      ]}
    >
      {message.image && (
        <Image source={{ uri: message.image }} style={styles.msgImage} />
      )}
      <Text
        style={message.sender === 'user' ? styles.userText : styles.msgText}
      >
        {message.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  message: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  userMsg: {
    alignSelf: 'flex-end',
    backgroundColor: darkTheme.userMessage,
  },
  aiMsg: {
    alignSelf: 'flex-start',
    backgroundColor: darkTheme.aiMessage,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
    color: darkTheme.textPrimary,
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
    color: darkTheme.textPrimary,
  },
  msgImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
});
