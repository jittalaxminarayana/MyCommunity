// IconSelector.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Common icon categories for booking facilities
const COMMON_ICONS = [
  // Sports
  'weight-lifter', 'tennis', 'basketball', 'soccer', 'cricket', 'swim', 'table-tennis', 'volleyball',
  'badminton', 'bike', 'dumbbell', 'yoga', 'hiking', 'run', 'hand-ball',
  
  // Spaces
  'desk', 'office-building', 'home', 'chair-rolling', 'sofa', 'television', 'projector',
  'table-furniture', 'lounge-chair', 'outdoor-lamp', 'pool', 'bbq', 'silverware', 'food',
  
  // Facilities
  'parking', 'washing-machine', 'shower', 'hair-dryer', 'air-conditioner', 'heat-pump',
  'water', 'coffee', 'room-service', 'party-popper', 'music', 'microphone', 
  
  // Activity types
  'calendar', 'clock', 'calendar-clock', 'account-group', 'presentation', 'school',
  'teach', 'book-open-page-variant', 'cart-outline', 'shopping',

  // General
  'home', 'warehouse', 'domain', 'office-building', 'castle', 'stadium', 'bridge', 'door', 
  'beach', 'forest', 'tree', 'nature', 'flower', 'flower-tulip', 'mountain', 'mushroom', 
  'palm-tree', 'park', 'water-well', 'weather-sunny',
];

const IconSelector = ({ visible, onClose, onSelectIcon, selectedIcon }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allIcons, setAllIcons] = useState(COMMON_ICONS);
  
  // Filter icons based on search query
  const filteredIcons = searchQuery.length > 0
    ? allIcons.filter(icon => icon.toLowerCase().includes(searchQuery.toLowerCase()))
    : allIcons;

  const renderIcon = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.iconItem,
        selectedIcon === item && styles.selectedIconItem
      ]}
      onPress={() => onSelectIcon(item)}
    >
      <Icon name={item} size={30} color={selectedIcon === item ? '#fff' : '#366732'} />
      <Text style={[
        styles.iconName,
        selectedIcon === item && styles.selectedIconName
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Icon</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search icons..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Icon name="close-circle" size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filteredIcons}
          renderItem={renderIcon}
          keyExtractor={item => item}
          numColumns={4}
          style={styles.iconList}
          contentContainerStyle={styles.iconListContent}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="emoticon-sad-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>No icons found</Text>
            </View>
          }
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => {
              onSelectIcon(selectedIcon);
              onClose();
            }}
          >
            <Text style={styles.selectButtonText}>Confirm Selection</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    backgroundColor: '#366732',
    padding: 10,
    paddingTop: Platform.OS === 'ios' ? 10 : 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: Platform.OS === 'ios' ? 10 : 30,
    padding: 5,
  },
  searchContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  iconList: {
    flex: 1,
  },
  iconListContent: {
    padding: 10,
  },
  iconItem: {
    width: '25%',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  selectedIconItem: {
    backgroundColor: '#366732',
  },
  iconName: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  selectedIconName: {
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  selectButton: {
    backgroundColor: '#366732',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default IconSelector;