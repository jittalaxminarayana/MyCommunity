import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image, Platform, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import SearchBar from '../../../components/SearchBar';

const AllUsersScreen = () => {
  const navigation = useNavigation();
  const { communityData } = useSelector((state) => state.user);
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [availableBlocks, setAvailableBlocks] = useState(['All']);

  useEffect(() => {
    // Set up real-time listener
    const unsubscribe = firestore()
      .collection('communities')
      .doc(communityData.id)
      .collection('users')
      .onSnapshot(
        (querySnapshot) => {
          const usersData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Extract unique blocks from apartment IDs
          const blocks = new Set(['All']);
          usersData.forEach(user => {
            if (user.apartmentId) {
              const block = user.apartmentId.split('-')[0]; // Extract block from "A-101" format
              if (block) {
                blocks.add(block.toUpperCase());
              }
            }
          });
          
          // Sort blocks alphabetically (keeping 'All' first)
          const sortedBlocks = Array.from(blocks).sort((a, b) => {
            if (a === 'All') return -1;
            if (b === 'All') return 1;
            return a.localeCompare(b);
          });
          
          setAvailableBlocks(sortedBlocks);
          setUsers(usersData);
          setFilteredUsers(usersData);
          setLoading(false);
          setRefreshing(false);
        },
        (error) => {
          console.error('Error fetching users:', error);
          setLoading(false);
          setRefreshing(false);
        }
      );

    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, [communityData.id]);

  useEffect(() => {
    let filtered = users;

    // Filter by block first
    if (selectedBlock !== 'All') {
      filtered = users.filter(user => {
        if (!user.apartmentId) return false;
        const userBlock = user.apartmentId.split('-')[0];
        return userBlock && userBlock.toUpperCase() === selectedBlock.toUpperCase();
      });
    }

    // Then filter by search query
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.apartmentId && user.apartmentId.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, users, selectedBlock]);

  const handleRefresh = () => {
    setRefreshing(true);
    // The onSnapshot will automatically update when data changes
    // so we just need to trigger the refreshing state
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleBlockFilter = (block) => {
    setSelectedBlock(block);
  };

  const renderBlockFilter = () => (
    <View style={styles.blockFilterContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.blockFilterContent}
      >
        {availableBlocks.map((block) => (
          <TouchableOpacity
            key={block}
            style={[
              styles.blockFilterButton,
              selectedBlock === block && styles.activeBlockFilter
            ]}
            onPress={() => handleBlockFilter(block)}
          >
            <Text style={[
              styles.blockFilterText,
              selectedBlock === block && styles.activeBlockFilterText
            ]}>
              {block === 'All' ? 'All' : `Block ${block}`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => navigation.navigate('EditUserScreen', { userId: item.id })}
    >
      <Image
        source={item.profileImageUrl ? { uri: item.profileImageUrl } : require('../../../../assets/community.png')}
        style={styles.userAvatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userDetails}>
          {item.apartmentId} • {item.role?.charAt(0).toUpperCase() + item.role?.slice(1)}
        </Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userStatusText}>
          {item.occupancyStatus?.charAt(0).toUpperCase() + item.occupancyStatus?.slice(1)}
        </Text>
      </View>
      <View style={styles.userStatus}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.approved ? '#4CAF50' : '#FF9800' }
        ]}>
          <Text style={styles.statusText}>
            {item.approved ? 'Approved' : 'Pending'}
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color="#666" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Community Users</Text>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#366732" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Community Users</Text>
      </View>

      {/* Block Filter */}
      {renderBlockFilter()}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar 
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name, email or apartment"
        />
      </View>

      {/* Users Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} 
          {selectedBlock !== 'All' ? ` in Block ${selectedBlock}` : ''}
        </Text>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-question" size={50} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery || selectedBlock !== 'All' 
                ? 'No users found for the selected criteria' 
                : 'No users found'
              }
            </Text>
          </View>
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('AddUserScreen')}
      >
        <Icon name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    backgroundColor: '#366732',
    padding: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    marginRight: 35,
  },
  backIconButton: {
    padding: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockFilterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  blockFilterContent: {
    paddingHorizontal: 15,
  },
  blockFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeBlockFilter: {
    backgroundColor: '#366732',
    borderColor: '#366732',
  },
  blockFilterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeBlockFilterText: {
    color: '#fff',
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  countContainer: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  countText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 80,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  userDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  userStatusText: {
    fontSize: 12,
    color: '#366732',
    fontWeight: '500',
  },
  userStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#366732',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});

export default AllUsersScreen;