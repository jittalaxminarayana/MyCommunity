import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';

const VisitorsLogScreen = ({ navigation }) => {
  const communityData = useSelector((state) => state?.user?.communityData);

  const [visitorsLog, setVisitorsLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredVisitors, setFilteredVisitors] = useState([]);

  useEffect(() => {
    if (!communityData?.id) return;

    const communityRef = firestore().collection('communities').doc(communityData.id);
    
    const unsubscribe = communityRef
      .collection('visitors')
      .orderBy('entryTime', 'desc')
      .onSnapshot(snapshot => {
        const visitors = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVisitorsLog(visitors);
        setFilteredVisitors(visitors);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [communityData?.id]);

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setFilteredVisitors(visitorsLog);
    } else {
      const filtered = visitorsLog.filter((item) =>
        item.visitorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.visitorPhone?.includes(searchQuery.trim()) ||
        item.apartmentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.hostName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pinCode?.toString().includes(searchQuery.trim())
      );
      setFilteredVisitors(filtered);
    }
  }, [searchQuery, visitorsLog]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'checked-in': return '#4CAF50';
      case 'checked-out': return '#2196F3';
      case 'rejected': return '#F44336';
      case 'expired': return '#FF9800';
      default: return '#757575';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'checked-in': return 'CHECKED IN';
      case 'checked-out': return 'CHECKED OUT';
      case 'rejected': return 'REJECTED';
      case 'expired': return 'EXPIRED';
      default: return status?.toUpperCase() || 'UNKNOWN';
    }
  };

  const renderVisitorItem = ({ item }) => {
    return (
      <TouchableOpacity style={styles.visitorCard}>
        <View style={styles.visitorHeader}>
          <Text style={styles.visitorName}>{item.visitorName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        
        <View style={styles.visitorDetails}>
          <Text style={styles.visitorInfo}>
            <Icon name="phone" size={14} color="#666" /> {item.visitorPhone}
          </Text>
          <Text style={styles.visitorInfo}>
            <Icon name="home" size={14} color="#666" /> Apartment: {item.apartmentId}
          </Text>
          <Text style={styles.visitorInfo}>
            <Icon name="account" size={14} color="#666" /> Host: {item.hostName}
          </Text>
          {item.pinCode && (
            <Text style={styles.visitorInfo}>
              <Icon name="lock" size={14} color="#666" /> PIN: {item.pinCode}
            </Text>
          )}
          {item.purpose && (
            <Text style={styles.visitorInfo}>
              <Icon name="information" size={14} color="#666" /> Purpose: {item.purpose}
            </Text>
          )}
          {item.vehicleNumber && (
            <Text style={styles.visitorInfo}>
              <Icon name="car" size={14} color="#666" /> Vehicle: {item.vehicleNumber}
            </Text>
          )}
          <Text style={styles.visitorInfo}>
            <Icon name="clock" size={14} color="#666" /> Entry: {new Date(item.entryTime?.toDate()).toLocaleString()}
          </Text>
          {item.exitTime && (
            <Text style={styles.visitorInfo}>
              <Icon name="clock-outline" size={14} color="#666" /> Exit: {new Date(item.exitTime?.toDate()).toLocaleString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visitors Log</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#366732" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visitors Log</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone, apartment, or host"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Icon name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {filteredVisitors.length} visitor{filteredVisitors.length !== 1 ? 's' : ''} found
        </Text>

        {/* Visitors List */}
        <FlatList
          data={filteredVisitors}
          renderItem={renderVisitorItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="account-group" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No visitors found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try adjusting your search terms' : 'No visitors have been logged yet'}
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    backgroundColor: '#366732',
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerPlaceholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 45,
    color: '#333',
    fontSize: 16,
  },
  clearSearchButton: {
    marginLeft: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 20,
  },
  visitorCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#366732',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  visitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  visitorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  visitorDetails: {
    gap: 6,
  },
  visitorInfo: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default VisitorsLogScreen;