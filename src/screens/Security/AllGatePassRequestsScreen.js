import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  TextInput,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';

const AllGatePassRequestsScreen = ({ navigation }) => {
  const userData = useSelector((state) => state?.user?.userData);
  const communityData = useSelector((state) => state?.user?.communityData);

  const [gatePassRequests, setGatePassRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRequests, setFilteredRequests] = useState([]);

  useEffect(() => {
    if (!communityData?.id) return;

    const communityRef = firestore().collection('communities').doc(communityData.id);
    
    const unsubscribe = communityRef
      .collection('gatePassRequests')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setGatePassRequests(requests);
        setFilteredRequests(requests);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [communityData?.id]);

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setFilteredRequests(gatePassRequests);
    } else {
      const filtered = gatePassRequests.filter((item) =>
        item.pinCode?.toString().includes(searchQuery.trim()) ||
        item.visitorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.visitorPhone?.includes(searchQuery.trim()) ||
        item.apartmentId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRequests(filtered);
    }
  }, [searchQuery, gatePassRequests]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#FF9800';
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#757575';
    }
  };

  const handleCheckIn = async (item) => {

      if (item.status !== 'pending') {
          Alert.alert(
              "Already Processed",
              `This gate pass has already been ${item.status}.`
          );
          return;
      }
    Alert.alert(
      "Verify Visitor",
      `Confirm details for ${item.visitorName}:\n\n` +
      `Phone: ${item.visitorPhone}\n` +
      `Apartment: ${item.apartmentId}\n` +
      `PIN: ${item.pinCode}`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Reject", 
          onPress: async () => {
            try {
              await firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('gatePassRequests')
                .doc(item.id)
                .update({ 
                  status: 'rejected',
                  processedAt: firestore.FieldValue.serverTimestamp(),
                  processedBy: userData?.id,
                  processedByName: userData?.displayName || 'Security'
                });
              
              await firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('visitors')
                .add({
                  visitorName: item.visitorName,
                  visitorPhone: item.visitorPhone,
                  hostUserId: item.requestedBy,
                  hostName: item.requestedByName,
                  apartmentId: item.apartmentId,
                  purpose: item.purpose,
                  entryTime: firestore.FieldValue.serverTimestamp(),
                  status: 'rejected',
                  vehicleNumber: item.vehicleNumber || '',
                  gatePassId: item.id,
                  processedBy: userData?.id,
                  processedByName: userData?.displayName || 'Security',
                  pinCode: item.pinCode
                });

              Alert.alert("Visitor Rejected", `${item.visitorName} has been rejected`);
            } catch (error) {
              Alert.alert("Error", "Failed to update status");
            }
          },
          style: 'destructive'
        },
        {
          text: "Check In",
          onPress: async () => {
            try {
              await firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('gatePassRequests')
                .doc(item.id)
                .update({ 
                  status: 'approved',
                  processedAt: firestore.FieldValue.serverTimestamp(),
                  processedBy: userData?.id,
                  processedByName: userData?.displayName || 'Security'
                });

              await firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('visitors')
                .add({
                  visitorName: item.visitorName,
                  visitorPhone: item.visitorPhone,
                  hostUserId: item.requestedBy,
                  hostName: item.requestedByName,
                  apartmentId: item.apartmentId,
                  purpose: item.purpose,
                  entryTime: firestore.FieldValue.serverTimestamp(),
                  status: 'checked-in',
                  vehicleNumber: item.vehicleNumber || '',
                  gatePassId: item.id,
                  processedBy: userData?.id,
                  processedByName: userData?.displayName || 'Security',
                  pinCode: item.pinCode
                });

              Alert.alert("Check In Successful", `${item.visitorName} has been checked in`);
            } catch (error) {
              console.error("Check-in error:", error);
              Alert.alert("Error", "Failed to check in visitor");
            }
          }
        }
      ]
    );
  };

  const renderGatePassRequest = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.gatePassCard}
        onPress={() => handleCheckIn(item)}
      >
        <View style={styles.gatePassHeader}>
          <Text style={styles.visitorName}>{item.visitorName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.gatePassInfo}>
          <Icon name="lock" size={14} color="#666" /> PIN: {item.pinCode}
        </Text>
        <Text style={styles.gatePassInfo}>
          <Icon name="phone" size={14} color="#666" /> {item.visitorPhone}
        </Text>
        <Text style={styles.gatePassInfo}>
          <Icon name="home" size={14} color="#666" /> Apt: {item.apartmentId}
        </Text>
        <Text style={styles.gatePassInfo}>
          <Icon name="account" size={14} color="#666" /> For: {item.requestedByName}
        </Text>
        <Text style={styles.gatePassInfo}>
          <Icon name="clock" size={14} color="#666" /> {new Date(item.createdAt?.toDate()).toLocaleString()}
        </Text>
        {item.purpose && (
          <Text style={styles.gatePassInfo}>
            <Icon name="information" size={14} color="#666" /> {item.purpose}
          </Text>
        )}
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
          <Text style={styles.headerTitle}>All Gate Pass Requests</Text>
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
        <Text style={styles.headerTitle}>All Gate Pass Requests</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by PIN, name, phone, or apartment"
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
          {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
        </Text>

        {/* Gate Pass Requests List */}
        <FlatList
          data={filteredRequests}
          renderItem={renderGatePassRequest}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="clipboard-text" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No gate pass requests found</Text>
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
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
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
  gatePassCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gatePassHeader: {
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
    fontSize: 11,
    fontWeight: 'bold',
  },
  gatePassInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
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
  },
});

export default AllGatePassRequestsScreen;