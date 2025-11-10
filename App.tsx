import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GemmaInference } from './src/inference/GemmaInference';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  image?: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

const App = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    loadChats();
    initModel();
  }, []);

  const initModel = async () => {
    try {
      await GemmaInference.initialize();
      setModelReady(true);
    } catch (error) {
      console.error('Model init failed:', error);
    }
  };

  const loadChats = async () => {
    const stored = await AsyncStorage.getItem('chats');
    if (stored) {
      const parsed = JSON.parse(stored);
      setChats(parsed);
      if (parsed.length > 0) setActiveChat(parsed[0].id);
    }
  };

  const saveChats = async (newChats: Chat[]) => {
    await AsyncStorage.setItem('chats', JSON.stringify(newChats));
    setChats(newChats);
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
    };
    const updated = [newChat, ...chats];
    saveChats(updated);
    setActiveChat(newChat.id);
    setSidebarOpen(false);
  };

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, response => {
      if (response.assets?.[0]?.uri) {
        setSelectedImage(response.assets[0].uri);
      }
    });
  };

  const sendMessage = async () => {
    if (!input.trim() && !selectedImage) return;
    if (!activeChat || !modelReady) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      image: selectedImage || undefined,
    };

    const updatedChats = chats.map(chat => {
      if (chat.id === activeChat) {
        const newMessages = [...chat.messages, userMsg];
        return {
          ...chat,
          messages: newMessages,
          title: chat.messages.length === 0 ? input.slice(0, 30) : chat.title,
        };
      }
      return chat;
    });

    saveChats(updatedChats);
    setInput('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const response = await GemmaInference.generate(input, selectedImage);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'ai',
      };

      const finalChats = updatedChats.map(chat => {
        if (chat.id === activeChat) {
          return { ...chat, messages: [...chat.messages, aiMsg] };
        }
        return chat;
      });

      saveChats(finalChats);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeMessages = chats.find(c => c.id === activeChat)?.messages || [];

  return (
    <View style={styles.container}>
      {sidebarOpen && (
        <View style={styles.sidebar}>
          <TouchableOpacity style={styles.newChatBtn} onPress={createNewChat}>
            <Text style={styles.newChatText}>+ New Chat</Text>
          </TouchableOpacity>
          <FlatList
            data={chats}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.chatItem,
                  activeChat === item.id && styles.activeChatItem,
                ]}
                onPress={() => {
                  setActiveChat(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Text style={styles.chatTitle}>{item.title}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.main}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSidebarOpen(!sidebarOpen)}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>LAI - Gemma 3N E2B</Text>
        </View>

        <FlatList
          data={activeMessages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.message,
                item.sender === 'user' ? styles.userMsg : styles.aiMsg,
              ]}
            >
              {item.image && (
                <Image source={{ uri: item.image }} style={styles.msgImage} />
              )}
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
          )}
          contentContainerStyle={styles.messageList}
        />

        {loading && <ActivityIndicator size="large" color="#007AFF" />}

        <View style={styles.inputContainer}>
          {selectedImage && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.preview} />
              <TouchableOpacity onPress={() => setSelectedImage(null)}>
                <Text style={styles.removeImg}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
              <Text style={styles.icon}>📷</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Message Gemma..."
              multiline
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={styles.sendBtn}
              disabled={loading || !modelReady}
            >
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#fff' },
  sidebar: { width: 260, backgroundColor: '#1a1a1a', padding: 10 },
  newChatBtn: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  newChatText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chatItem: { padding: 12, borderRadius: 6, marginBottom: 4 },
  activeChatItem: { backgroundColor: '#2a2a2a' },
  chatTitle: { color: '#ddd', fontSize: 14 },
  main: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuIcon: { fontSize: 24, marginRight: 15 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  messageList: { padding: 15 },
  message: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  userMsg: { alignSelf: 'flex-end', backgroundColor: '#007AFF' },
  aiMsg: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0' },
  msgText: { fontSize: 15, color: '#000' },
  msgImage: { width: 200, height: 200, borderRadius: 8, marginBottom: 8 },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 10,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  preview: { width: 60, height: 60, borderRadius: 8, marginRight: 8 },
  removeImg: { fontSize: 20, color: '#ff3b30' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8 },
  icon: { fontSize: 24 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendText: { color: '#fff', fontWeight: '600' },
});

export default App;
