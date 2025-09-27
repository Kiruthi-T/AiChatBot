import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = 'AI is thinking...' 
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#007AFF" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginVertical: 5,
  },
  text: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
});

export default LoadingIndicator;