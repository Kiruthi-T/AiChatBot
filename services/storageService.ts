import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../types/chatTypes';

const STORAGE_KEYS = {
  CHAT_HISTORY: '@chat_history',
};

export class StorageService {
  static async saveChatHistory(messages: Message[]): Promise<void> {
    try {
      const jsonValue = JSON.stringify(messages);
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, jsonValue);
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  static async loadChatHistory(): Promise<Message[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }

  static async clearChatHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  }
}