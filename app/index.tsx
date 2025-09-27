import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Text, 
  StatusBar, 
  KeyboardAvoidingView, 
  Platform,
  Dimensions
} from 'react-native';
import { GiftedChat, IMessage, Bubble, Send, InputToolbar, Composer } from 'react-native-gifted-chat';
import { AIService } from '../services/aiService';
import { StorageService } from '../services/storageService';
import { Message } from '../types/chatTypes';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

const { width, height } = Dimensions.get('window');

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const router = useRouter();

  // Load chat history on app start
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const savedMessages = await StorageService.loadChatHistory();
      if (savedMessages.length > 0) {
        setMessages(savedMessages);
      } else {
        // Initial welcome message
        setMessages([
          {
            _id: '1',
            text: 'Hello! I\'m your AI assistant. How can I help you today?',
            createdAt: new Date(),
            user: {
              _id: 2,
              name: 'AI Assistant',
              avatar: '🤖',
            },
          },
        ]);
      }
    } catch (error) {
      console.log('Error loading chat history:', error);
      // Set default message if loading fails
      setMessages([
        {
          _id: '1',
          text: 'Hello! I\'m your AI assistant. How can I help you today?',
          createdAt: new Date(),
          user: {
            _id: 2,
            name: 'AI Assistant',
            avatar: '🤖',
          },
        },
      ]);
    }
  };

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    const userMessage = newMessages[0];
    
    // Add user message to chat immediately
    setMessages(previousMessages => 
      GiftedChat.append(previousMessages, [{
        ...userMessage,
        _id: Math.random().toString(36).substring(7), // Ensure unique ID
      }])
    );

    setIsLoading(true);

    try {
      // Get AI response
      const aiResponse = await AIService.sendMessage(userMessage.text);
      
      const botMessage: Message = {
        _id: Math.random().toString(36).substring(7),
        text: aiResponse,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI Assistant',
          avatar: '🤖',
        },
      };

      // Add AI response to chat
      setMessages(previousMessages => 
        GiftedChat.append(previousMessages, [botMessage])
      );

    } catch (error) {
      console.log('❌ Error getting AI response:', error);
      
      // Show error message in chat
      const errorMessage: Message = {
        _id: Math.random().toString(36).substring(7),
        text: 'Sorry, I encountered an error. Please try again or check your API configuration.',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI Assistant',
          avatar: '🤖',
        },
      };
      
      setMessages(previousMessages => 
        GiftedChat.append(previousMessages, [errorMessage])
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      StorageService.saveChatHistory(messages);
    }
  }, [messages]);

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedMessageId(messageId);
      
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy text');
    }
  };

  const clearChat = async () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear the chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearChatHistory();
            setMessages([
              {
                _id: '1',
                text: 'Chat cleared! How can I help you now?',
                createdAt: new Date(),
                user: {
                  _id: 2,
                  name: 'AI Assistant',
                  avatar: '🤖',
                },
              },
            ]);
          },
        },
      ]
    );
  };

  const navigateToProfile = () => {
    router.push('/profile');
  };

  const debugAPIs = async () => {
    console.log('🔍 Testing API Configuration...');
    const config = AIService.checkAPIConfiguration();
    console.log('API Config:', config);
    
    setIsLoading(true);
    try {
      const debugInfo = await AIService.debugAPIs();
      
      const debugMessage: Message = {
        _id: Math.random().toString(36).substring(7),
        text: debugInfo,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI Assistant',
          avatar: '🔧',
        },
      };

      setMessages(previousMessages => 
        GiftedChat.append(previousMessages, [debugMessage])
      );
    } catch (error) {
      Alert.alert('Debug Error', 'Failed to get debug information');
    } finally {
      setIsLoading(false);
    }
  };

  // Custom bubble component
  const renderBubble = (props: any) => {
    const isAI = props.currentMessage.user._id === 2;
    const messageId = props.currentMessage._id;
    const isCopied = copiedMessageId === messageId;
    
    return (
      <View style={[
        styles.bubbleContainer,
        isAI ? styles.aiBubbleContainer : styles.userBubbleContainer
      ]}>
        <Bubble
          {...props}
          wrapperStyle={{
            left: {
              backgroundColor: '#ffffff',
              padding: 12,
              borderRadius: 20,
              borderBottomLeftRadius: 4,
              marginVertical: 4,
              maxWidth: width * 0.8,
            },
            right: {
              backgroundColor: '#007AFF',
              padding: 12,
              borderRadius: 20,
              borderBottomRightRadius: 4,
              marginVertical: 4,
              maxWidth: width * 0.8,
            },
          }}
          textStyle={{
            left: {
              color: '#333333',
              fontSize: 16,
              lineHeight: 20,
            },
            right: {
              color: '#ffffff',
              fontSize: 16,
              lineHeight: 20,
            },
          }}
        />
        <TouchableOpacity
          style={[
            styles.copyButton,
            isAI ? styles.copyButtonAI : styles.copyButtonUser,
            isCopied && styles.copyButtonCopied
          ]}
          onPress={() => copyToClipboard(props.currentMessage.text, messageId)}
        >
          <Ionicons 
            name={isCopied ? "checkmark" : "copy-outline"} 
            size={16} 
            color={isCopied ? "#4CAF50" : (isAI ? "#666" : "#fff")} 
          />
        </TouchableOpacity>
        {isCopied && (
          <View style={[
            styles.copiedIndicator,
            isAI ? styles.copiedIndicatorAI : styles.copiedIndicatorUser
          ]}>
            <Text style={styles.copiedText}>Copied!</Text>
          </View>
        )}
      </View>
    );
  };

  // Custom send button
  const renderSend = (props: any) => {
    return (
      <Send
        {...props}
        disabled={!props.text || isLoading}
        containerStyle={styles.sendContainer}
      >
        <View style={[
          styles.sendButton,
          props.text && !isLoading ? styles.sendButtonActive : styles.sendButtonDisabled
        ]}>
          <Ionicons 
            name="send" 
            size={20} 
            color="white" 
          />
        </View>
      </Send>
    );
  };

  // Custom input toolbar
  const renderInputToolbar = (props: any) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputPrimary}
      />
    );
  };

  // Custom composer
  const renderComposer = (props: any) => {
    return (
      <View style={styles.composerContainer}>
        <Composer
          {...props}
          textInputStyle={styles.composerText}
          placeholder="Type your message..."
          placeholderTextColor="#999"
          multiline={true}
          textInputProps={{
            blurOnSubmit: false,
            enablesReturnKeyAutomatically: true,
          }}
        />
      </View>
    );
  };

  // Custom loading component
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingBubble}>
        <Text style={styles.loadingText}>AI is thinking...</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatar}>🤖</Text>
              <View style={styles.onlineIndicator} />
            </View>
            <View>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <Text style={styles.headerSubtitle}>Online • Ready to help</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={debugAPIs} style={styles.headerButton}>
              <Ionicons name="bug-outline" size={22} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={22} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity onPress={navigateToProfile} style={styles.headerButton}>
              <Ionicons name="person-outline" size={22} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.chatContainer}>
          <GiftedChat
            messages={messages}
            onSend={onSend}
            user={{
              _id: 1,
              name: 'User',
              avatar: '👤',
            }}
            renderBubble={renderBubble}
            renderSend={renderSend}
            renderInputToolbar={renderInputToolbar}
            renderComposer={renderComposer}
            renderLoading={renderLoading}
            isLoading={isLoading}
            alwaysShowSend={true}
            showUserAvatar={false}
            minInputToolbarHeight={76}
            listViewProps={{
              style: styles.messagesList,
            }}
            timeFormat="HH:mm"
            dateFormat="MMM D, YYYY"
            scrollToBottom
            showAvatarForEveryMessage={false}
            alignTop={false}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    fontSize: 32,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  messagesList: {
    backgroundColor: 'transparent',
  },
  bubbleContainer: {
    marginVertical: 4,
    position: 'relative',
  },
  aiBubbleContainer: {
    alignSelf: 'flex-start',
  },
  userBubbleContainer: {
    alignSelf: 'flex-end',
  },
  copyButton: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  copyButtonAI: {
    bottom: 8,
    right: 8,
  },
  copyButtonUser: {
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  copyButtonCopied: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  copiedIndicator: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    top: -25,
  },
  copiedIndicatorAI: {
    left: 0,
    backgroundColor: '#E8F5E8',
  },
  copiedIndicatorUser: {
    right: 0,
    backgroundColor: '#E8F5E8',
  },
  copiedText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
  },
  inputToolbar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 76,
  },
  inputPrimary: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  composerContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
    maxHeight: 100,
  },
  composerText: {
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  loadingContainer: {
    alignItems: 'flex-start',
    marginLeft: 16,
    marginBottom: 8,
  },
  loadingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
});