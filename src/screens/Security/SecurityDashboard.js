import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Linking, 
  ActivityIndicator,
  Modal,
  SafeAreaView,
  BackHandler,
  Alert,
  TouchableWithoutFeedback,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import NotificationService from '../../components/ NotificationService';

const SecurityDashboard = ({ navigation }) => {
  const userData = useSelector((state) => state?.user?.userData);
  const communityData = useSelector((state) => state?.user?.communityData);

  // State for storing fetched data
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [homeStoreCategories, setHomeStoreCategories] = useState([]);
  const [gatePassRequests, setGatePassRequests] = useState([]);
  const [gatePassHistory, setGatePassHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for modals and expanded sections
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showAllEmergencyContacts, setShowAllEmergencyContacts] = useState(false);
  const [showAllHomeStore, setShowAllHomeStore] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Improved search functionality with debounce
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsSearching(true);
      setHasSearched(true);
      
      const debounceTimer = setTimeout(() => {
        searchGatePass(searchQuery.trim());
      }, 300);

      return () => clearTimeout(debounceTimer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
      setHasSearched(false);
    }
  }, [searchQuery, gatePassRequests]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      NotificationService.requestUserPermission();
      NotificationService.getFCMToken(userData?.id, communityData?.id); // Pass user and community IDs
      NotificationService.handleForegroundNotifications();
      NotificationService.handleBackgroundNotifications();
      NotificationService.handleKilledStateNotifications();
  
      // Set up notification listeners
      async function setupListeners() {
        const unsubscribeForeground = await NotificationService.onNotificationEvent();
        const unsubscribeBackground = await NotificationService.onBackgroundEvent();
      }
      setupListeners();
    }, 500);
  
    return () => clearTimeout(timeout);
  }, [userData?.id, communityData?.id]);
   
  useEffect(() => {
    if (!communityData?.id) return;
  
    const communityRef = firestore().collection('communities').doc(communityData.id);
  
    // Set up snapshot listeners
    const unsubscribeEmergency = communityRef
      .collection('emergencyContacts')
      .onSnapshot(snapshot => {
        const contacts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEmergencyContacts(contacts);
      });
  
    const unsubscribeHomeStore = communityRef
      .collection('homeStoreCategories')
      .onSnapshot(snapshot => {
        const homeCategories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setHomeStoreCategories(homeCategories);
      });

    // Listen to gate pass requests - get more records for better search
    const unsubscribeGatePassRequests = communityRef
      .collection('gatePassRequests')
      .orderBy('createdAt', 'desc')
      .limit(50) // Increased limit for better search coverage
      .onSnapshot(snapshot => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setGatePassRequests(requests);
      });

    // Listen to gate pass history (recent passes)
    const unsubscribeGatePassHistory = communityRef
      .collection('visitors')
      .orderBy('entryTime', 'desc')
      .limit(20)
      .onSnapshot(snapshot => {
        const history = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setGatePassHistory(history);
      });
  
    setLoading(false);
  
    // Cleanup listeners on unmount
    return () => {
      unsubscribeEmergency();
      unsubscribeHomeStore();
      unsubscribeGatePassRequests();
      unsubscribeGatePassHistory();
    };
  }, [communityData?.id]);

  useFocusEffect(
    React.useCallback(() => {
      const backAction = () => {
        Alert.alert(
          "Hold on!",
          "Are you sure you want to exit?",
          [
            {
              text: "Cancel",
              onPress: () => null,
              style: "cancel"
            },
            { text: "YES", onPress: () => BackHandler.exitApp() }
          ]
        );
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => backHandler.remove();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Improved search function
  const searchGatePass = (query) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      // Filter by PIN code (exact match) and also search by visitor name (partial match)
      const filteredResults = gatePassRequests.filter((item) => {
        const pinMatch = item.pinCode && item.pinCode.toString().includes(query);
        const nameMatch = item.visitorName && 
          item.visitorName.toLowerCase().includes(query.toLowerCase());
        const phoneMatch = item.visitorPhone && 
          item.visitorPhone.toString().includes(query);
        
        return pinMatch || nameMatch || phoneMatch;
      });

      // Sort results: pending first, then by creation date
      const sortedResults = filteredResults.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        
        // If both have same status, sort by creation date (newest first)
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB - dateA;
      });

      setSearchResults(sortedResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Display limited emergency contacts or all based on showAllEmergencyContacts flag
  const displayedEmergencyContacts = showAllEmergencyContacts 
    ? emergencyContacts 
    : emergencyContacts.slice(0, 5);

  const displayedGatePassHistory = gatePassHistory.slice(0, 3);

  // Open modal with service details
  const handleServicePress = (item, type) => {
    setSelectedService({ ...item, type });
    setModalVisible(true);
  };

  // Render service card for home store categories
  const renderHomeServiceCard = ({ item, index }) => {
    // Only show first 8 items when not showing all
    if (!showAllHomeStore && index >= 8) return null;
    
    return (
      <TouchableOpacity 
        style={styles.serviceCard}
        onPress={() => handleServicePress(item, 'homestore')}
      >
        <View style={styles.homeServiceIconContainer}>
          <Icon name={item.icon} size={28} color="#f68422" />
        </View>
        <Text style={styles.serviceName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  // Render gate pass request card
  const renderGatePassRequest = ({ item }) => {
    console.log("item:", item)
    const getStatusColor = (status) => {
      switch(status) {
        case 'pending': return '#FF9800';
        case 'approved': return '#4CAF50';
        case 'rejected': return '#F44336';
        case 'expired': return '#757575';
        default: return '#757575';
      }
    };

    const handleCheckIn = async () => {
      // Check if already processed
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
        `PIN: ${item.pinCode}\n` +
        `Purpose: ${item.purpose || 'Not specified'}`,
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
                    processedByName: userData?.role || 'Security'
                  });
                
                // Add to visitor log as rejected
                await firestore()
                  .collection('communities')
                  .doc(communityData.id)
                  .collection('visitors')
                  .add({
                    visitorName: item.visitorName,
                    visitorPhone: item.visitorPhone,
                    hostUserId: item.requestedByUserId,
                    hostName: item.requestedByName,
                    apartmentId: item.apartmentId,
                    purpose: item.purpose || 'Visit',
                    entryTime: firestore.FieldValue.serverTimestamp(),
                    status: 'rejected',
                    vehicleNumber: item.vehicleNumber || '',
                    gatePassId: item.id,
                    processedBy: userData?.id,
                    processedByName: userData?.role || 'Security',
                    pinCode: item.pinCode
                  });
  
                Alert.alert("Visitor Rejected", `${item.visitorName} has been rejected`);
                
                // Clear search if this was a search result
                if (searchResults.length > 0) {
                  setSearchQuery('');
                  setSearchResults([]);
                }
              } catch (error) {
                console.error("Rejection error:", error);
                Alert.alert("Error", "Failed to reject visitor. Please try again.");
              }
            },
            style: 'destructive'
          },
          {
            text: "Check In",
            onPress: async () => {
              try {
                // Update the gate pass status
                await firestore()
                  .collection('communities')
                  .doc(communityData.id)
                  .collection('gatePassRequests')
                  .doc(item.id)
                  .update({ 
                    status: 'approved',
                    processedAt: firestore.FieldValue.serverTimestamp(),
                    processedBy: userData?.id,
                    processedByName: userData?.role || 'Security'
                  });
  
                // Create visitor log entry
                await firestore()
                  .collection('communities')
                  .doc(communityData.id)
                  .collection('visitors')
                  .add({
                    visitorName: item.visitorName,
                    visitorPhone: item.visitorPhone,
                    hostUserId: item.requestedByUserId,
                    hostName: item.requestedByName,
                    apartmentId: item.apartmentId,
                    purpose: item.purpose || 'Visit',
                    entryTime: firestore.FieldValue.serverTimestamp(),
                    status: 'checked-in',
                    vehicleNumber: item.vehicleNumber || '',
                    gatePassId: item.id,
                    processedBy: userData?.id,
                    processedByName: userData?.name || 'Security',
                    pinCode: item.pinCode
                  });


                // Update mypasses colletion 
                await firestore()
                  .collection('communities')
                  .doc(communityData.id)
                  .collection('gatePasses')
                  .doc(item.linkedGatePassId)
                  .update({
                    status: 'used'
                  });
  
                Alert.alert("Check In Successful", `${item.visitorName} has been checked in`);
                
                // Clear search if this was a search result
                if (searchResults.length > 0) {
                  setSearchQuery('');
                  setSearchResults([]);
                }
              } catch (error) {
                console.error("Check-in error:", error);
                Alert.alert("Error", "Failed to check in visitor. Please try again.");
              }
            }
          }
        ]
      );
    };

    const isFromSearch = searchResults.length > 0;
    const formatDate = (timestamp) => {
      if (!timestamp) return 'Unknown time';
      try {
        return new Date(timestamp.toDate()).toLocaleString();
      } catch {
        return 'Unknown time';
      }
    };

    return (
      <TouchableOpacity 
        style={[
          styles.gatePassCard,
          isFromSearch && styles.highlightedCard,
          // item.status !== 'pending' && styles.processedCard
        ]}
        onPress={handleCheckIn}
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
        {item.purpose && (
          <Text style={styles.gatePassInfo}>
            <Icon name="clipboard-text" size={14} color="#666" /> Purpose: {item.purpose}
          </Text>
        )}
        <Text style={styles.gatePassInfo}>
          <Icon name="clock" size={14} color="#666" /> {formatDate(item.createdAt)}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render gate pass history item  
  const renderGatePassHistory = ({ item }) => {
    const getStatusColor = (status) => {
      switch(status) {
        case 'checked-in': return '#4CAF50';
        case 'checked-out': return '#2196F3';
        case 'rejected': return '#F44336';
        case 'expired': return '#757575';
        default: return '#757575';
      }
    };

    const formatDate = (timestamp) => {
      if (!timestamp) return 'Unknown time';
      try {
        return new Date(timestamp.toDate()).toLocaleString();
      } catch {
        return 'Unknown time';
      }
    };

    return (
      <TouchableOpacity 
        style={styles.historyCard}
        onPress={() => navigation.navigate('GatePassDetails', { gatePass: item })}
      >
        <View style={styles.historyHeader}>
          <Text style={styles.historyVisitorName}>{item.visitorName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status?.toUpperCase().replace('-', ' ')}</Text>
          </View>
        </View>
        <Text style={styles.historyInfo}>
          <Icon name="home" size={14} color="#666" /> Apt: {item.apartmentId}
        </Text>
        <Text style={styles.historyInfo}>
          <Icon name="account" size={14} color="#666" /> Host: {item.hostName}
        </Text>
        <Text style={styles.historyInfo}>
          <Icon name="clock" size={14} color="#666" /> {formatDate(item.entryTime)}
        </Text>
        {item.pinCode && (
          <Text style={styles.historyInfo}>
            <Icon name="lock" size={14} color="#666" /> PIN: {item.pinCode}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Render service details in modal (same as ResidentDashboard)
  const renderServiceDetails = () => {
    if (!selectedService) return null;

    if (selectedService.type === 'homestore') {
      return (
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.homeServiceIconContainer2}>
              <Icon name={selectedService.icon} size={26} color="#f68422" />
            </View>
            <Text style={styles.modalTitle}>{selectedService.name}</Text>
          </View>
          
          <Text style={styles.vendorTitle}>Available Vendors</Text>
          
          <ScrollView style={{marginBottom:40}} showsVerticalScrollIndicator={false}>
          {selectedService.vendors && selectedService.vendors.length > 0 ? (
            selectedService.vendors.map((vendor, index) => (
              <View key={index} style={styles.vendorCard}>
                <View style={styles.vendorHeader}>
                  <Text style={styles.vendorName}>{vendor.name}</Text>
                  {vendor.isVerified && (
                    <Icon name="check-decagram" size={18} color="#4CAF50" style={{ marginLeft: 8 }} />
                  )}
                </View>

                {/* Vendor Image Gallery */}
                {vendor.images && vendor.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                    {vendor.images.map((uri, i) => (
                      <Image
                        key={i}
                        source={{ uri }}
                        style={styles.vendorImage}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                )}

                <Text style={styles.vendorInfo}>
                  <Icon name="map-marker" size={16} color="#777" /> {vendor.address}
                </Text>

                <View style={styles.vendorContact}>
                  <Icon name="phone" size={16} color="#777" />
                  <Text style={styles.vendorPhone}> {vendor.phone}</Text>
                  <TouchableOpacity
                    style={styles.callButton2}
                    onPress={() => Linking.openURL(`tel:${vendor.phone}`)}
                  >
                    <Icon name="phone" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.vendorRating}>
                  <Icon name="star" size={16} color="#FFC107" />
                  <Text style={styles.ratingText}>{vendor.rating || 'New'}</Text>
                </View>

                <Text style={styles.vendorServices}>
                  <Icon name="tools" size={14} color="#777" /> {vendor.services?.join(', ')}
                </Text>

                <Text style={styles.vendorAvailability}>
                  <Icon name="calendar" size={14} color="#777" /> {vendor.availability?.workingDays?.join(', ')} • {vendor.availability?.hours}
                </Text>

                <Text style={styles.vendorFee}>
                  <Icon name="cash" size={14} color="#777" /> {vendor.feeStructure || 'Free'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No vendors available at the moment</Text>
          )}
          </ScrollView>
        </View>
      );
    }
    
    return null;
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Image
              source={userData?.photoURL ? { uri: userData.photoURL } : require('../../../assets/community.png')}
              style={styles.userAvatar}
            />
            <View style={styles.userTextContainer}>
              <Text style={styles.userName}>{communityData?.name || 'Security Hub'}</Text>
              <Text style={styles.welcomeText}>{userData?.name || 'Security Guard'}</Text>
            </View>
          </View>

          <View style={styles.badgeContainer}>
            <View style={styles.securityBadge}>
              <Icon name="shield-check" size={20} color="#366732" />
              <Text style={styles.securityText}>SECURITY</Text>
            </View>
          </View>
        </View> 

        {/* QR Scanner & Gate Pass Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gate Pass Management</Text>
          </View>
          <View style={styles.cardRow}>
            <TouchableOpacity 
              style={styles.featureCard} 
              onPress={() => navigation.navigate('QRScannerScreen')}
            >
              <View style={[styles.featureIconContainer, { backgroundColor: '#fff8e1' }]}>
                <Icon name="qrcode-scan" size={28} color="#f68422" />
              </View>
              <Text style={styles.featureText}>Scan QR Code</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.featureCard} 
              onPress={() => navigation.navigate('NewGatePassRequestScreen')}
            >
              <View style={[styles.featureIconContainer, { backgroundColor: '#fff8e1' }]}>
                <Icon name="account-plus" size={28} color="#f68422" />
              </View>
              <Text style={styles.featureText}>New Gate Pass Request</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gate Pass Search</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AllGatePassRequestsScreen')}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {/* Enhanced Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by PIN, name, or phone"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setHasSearched(false);
                  }}
                >
                  <Icon name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Search Results or Recent Requests */}
          {isSearching ? (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator size="small" color="#366732" />
              <Text style={styles.searchLoadingText}>Searching...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultsTitle}>
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </Text>
              <FlatList
                data={searchResults}
                renderItem={renderGatePassRequest}
                keyExtractor={item => item.id}
                scrollEnabled={false}
              />
            </View>
          ) : hasSearched && searchQuery.length > 0 ? (
            <View style={styles.noResultsContainer}>
              <Icon name="magnify" size={48} color="#ccc" />
              <Text style={styles.noResultsText}>No gate passes found</Text>
              <Text style={styles.noResultsSubtext}>
                Try searching with a different PIN, name, or phone number
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.recentRequestsTitle}>Recent Requests</Text>
              {gatePassRequests.length > 0 ? (
                <FlatList
                  data={gatePassRequests.slice(0, 3)}
                  renderItem={renderGatePassRequest}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.noDataText}>No recent gate pass requests</Text>
              )}
            </>
          )}
        </View>

        {/* Visitors log */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Visitors Log</Text>
            {gatePassHistory.length >= 3 && (
              <TouchableOpacity onPress={() => navigation.navigate('VisitorsLogScreen')}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
            )}
          </View>
          {displayedGatePassHistory.length > 0 ? (
            <FlatList
              data={displayedGatePassHistory}
              renderItem={renderGatePassHistory}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noDataText}>No visitors log available</Text>
          )}
        </View>

        {/* Emergency Contacts Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            {emergencyContacts.length > 5 && (
              <TouchableOpacity onPress={() => setShowAllEmergencyContacts(!showAllEmergencyContacts)}>
                <Text style={styles.seeAll}>
                  {showAllEmergencyContacts ? 'Show Less' : 'See All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.emergencyList}>
            {displayedEmergencyContacts.map(contact => (
              <TouchableOpacity key={contact.id} style={styles.contactCard}>
                <View style={styles.contactIconContainer}>
                  <Icon name={contact.icon} size={24} color="#366732" />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactNumber}>{contact.number}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.callButton} 
                  onPress={() => Linking.openURL(`tel:${contact.number}`)}
                >
                  <Icon name="phone" size={19} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Home Center Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Home Center</Text>
            {homeStoreCategories.length > 8 && (
              <TouchableOpacity onPress={() => setShowAllHomeStore(!showAllHomeStore)}>
                <Text style={styles.seeAll}>
                  {showAllHomeStore ? 'Show Less' : 'See All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={homeStoreCategories}
            renderItem={renderHomeServiceCard}
            keyExtractor={item => item.id}
            numColumns={4}
            columnWrapperStyle={styles.serviceRow}
            scrollEnabled={false}
            contentContainerStyle={styles.serviceContainer}
          />
        </View>
      </ScrollView>

      {/* Modal for service details */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.dragIndicator} />
                {renderServiceDetails()}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingBottom: 14,
  },
  header: {
    backgroundColor: '#366732',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 3,
    marginBottom: 20,
    paddingTop: 33
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userTextContainer: {
    marginLeft: 15,
  },
  welcomeText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  badgeContainer: {
    alignSelf: 'flex-end',
    marginTop: -20,
  },
  securityBadge: {
    backgroundColor: '#E6F2EA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityText: {
    color: '#366732',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 14,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  gatePassCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginVertical: 6,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  highlightedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#366732',
    backgroundColor: '#f0f7f0',
  },
  gatePassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gatePassInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  historyCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyVisitorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  historyInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  emergencyList: {
    marginTop: 8,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  contactNumber: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  callButton: {
    width: 33,
    height: 33,
    borderRadius: 18,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceContainer: {
    paddingTop: 8,
  },
  serviceRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceCard: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 12,
  },
  homeServiceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff8e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  homeServiceIconContainer2: {
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: '#fff8e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  noDataText: {
    fontSize: 15,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  
  // Modal styles (same as ResidentDashboard)
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 12,
    maxHeight: '85%',
  },
  dragIndicator: {
    alignSelf: 'center',
    width: 50,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 3,
    marginBottom: 10,
    marginTop: -5
  },
  modalContent: {
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  vendorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    alignSelf: 'center'
  },
  vendorCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  vendorInfo: {
    fontSize: 14,
    color: '#555',
    marginVertical: 4,
  },
  vendorContact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  vendorPhone: {
    fontSize: 14,
    color: '#444',
    marginLeft: 4,
    flex: 1,
  },
  callButton2: {
    backgroundColor: '#4CAF50',
    padding: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  vendorRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#555',
  },
  vendorServices: {
    fontSize: 14,
    marginBottom: 4,
    color: '#444',
  },
  vendorAvailability: {
    fontSize: 13,
    marginBottom: 4,
    color: '#666',
  },
  vendorFee: {
    fontSize: 13,
    color: '#666',
  },
  vendorImage: {
    width: 100,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  imageScroll: {
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  searchContainer: {
    marginBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#333',
  },
  clearSearchButton: {
    marginLeft: 8,
  },
  searchResultsContainer: {
    marginTop: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#366732',
    marginBottom: 8,
  },
  searchLoading: {
    marginVertical: 10,
  },
  recentRequestsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  searchLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
    marginTop: 10,
  },

  noResultsSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 20,
  },
});

export default SecurityDashboard;