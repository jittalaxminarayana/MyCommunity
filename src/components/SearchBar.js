import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SearchBar = ({ 
  value, 
  onChangeText, 
  placeholder = "Search...", 
  style,
  onClear,
  showClearButton = true 
}) => {
  const handleClear = () => {
    onChangeText('');
    if (onClear) {
      onClear();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        returnKeyType="search"
      />
      {showClearButton && value.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Icon name="close-circle" size={20} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0, // Remove default padding
  },
  clearButton: {
    marginLeft: 10,
    padding: 2,
  },
});

export default SearchBar;