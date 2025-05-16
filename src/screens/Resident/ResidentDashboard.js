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
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import {useFocusEffect } from '@react-navigation/native';

const ResidentDashboard = ({ navigation }) => {
  const userData = useSelector((state) => state?.user?.userData);
  console.log("userData:", userData)
  const communityData = useSelector((state) => state?.user?.communityData);

  // State for storing fetched data
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [homeStoreCategories, setHomeStoreCategories] = useState([]);
  const [bookingsCategories, setBookingsCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for modals and expanded sections
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showAllEmergencyContacts, setShowAllEmergencyContacts] = useState(false);
  const [showAllHomeStore, setShowAllHomeStore] = useState(false);
  const [showAllBookings, setShowAllBookings] = useState(false);

  useEffect(() => {
    const fetchCommunityData = async () => {
      if (!communityData?.id) return;
      
      try {
        const communityRef = firestore()
          .collection('communities')
          .doc(communityData.id);

        // Fetch all data in parallel
        const [emergencySnap, homeStoreSnap, bookingsSnap] = await Promise.all([
          communityRef.collection('emergencyContacts').get(),
          communityRef.collection('homeStoreCategories').get(),
          communityRef.collection('bookingsCategories').get()
        ]);

        // Process emergency contacts
        const contacts = emergencySnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEmergencyContacts(contacts);

        // Process home store categories
        const homeCategories = homeStoreSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setHomeStoreCategories(homeCategories);

        // Process bookings categories
        const bookings = bookingsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBookingsCategories(bookings);

      } catch (error) {
        console.error('Error fetching community data:', error);
        // Optionally set default data if fetch fails
        setEmergencyContacts([]);
        setHomeStoreCategories([]);
        setBookingsCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityData();
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
        <ActivityIndicator size="large" color="#366732" />
      </View>
    );
  }

  // Display limited emergency contacts or all based on showAllEmergencyContacts flag
  const displayedEmergencyContacts = showAllEmergencyContacts 
    ? emergencyContacts 
    : emergencyContacts.slice(0, 5);

  // Open modal with service details
  const handleServicePress = (item, type) => {
    console.log("item:", item)
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

  // Render service card for bookings categories
  const renderBookingsServiceCards = ({ item, index }) => {
    // Only show first 8 items when not showing all
    if (!showAllBookings && index >= 8) return null;
    
    return (
      <TouchableOpacity 
        style={styles.serviceCard}
        onPress={() => handleServicePress(item, 'booking')}
      >
        <View style={styles.bookingsServiceIconContainer}>
          <Icon name={item.icon} size={28} color="#366732" />
        </View>
        <Text style={styles.serviceName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  // Render service details in modal
  const renderServiceDetails = () => {
    if (!selectedService) return null;

    // Different layouts based on service type
    if (selectedService.type === 'homestore') {
      return (
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.homeServiceIconContainer}>
              <Icon name={selectedService.icon} size={36} color="#f68422" />
            </View>
            <Text style={styles.modalTitle}>{selectedService.name}</Text>
          </View>
          
          <Text style={styles.vendorTitle}>Available Vendors</Text>
          
          {selectedService.vendors ? (
            selectedService.vendors.map((vendor, index) => (
              <View key={index} style={styles.vendorCard}>
                <Text style={styles.vendorName}>{vendor.name}</Text>
                <Text style={styles.vendorInfo}>{vendor.address}</Text>
                <View style={styles.vendorContact}>
                  <Text style={styles.vendorPhone}>{vendor.phone}</Text>
                  <TouchableOpacity 
                    style={styles.callButton}
                    onPress={() => Linking.openURL(`tel:${vendor.phone}`)}
                  >
                    <Icon name="phone" size={19} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No vendors available at the moment</Text>
          )}
        </View>
      );
    } else if (selectedService.type === 'booking') {
      return (
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.bookingsServiceIconContainer}>
              <Icon name={selectedService.icon} size={36} color="#366732" />
            </View>
            <Text style={styles.modalTitle}>{selectedService.name}</Text>
          </View>
          
          <Text style={styles.facilityTitle}>Facility Details</Text>
          {selectedService.facilities ? (
            <View style={styles.facilityDetails}>
              <Text style={styles.facilityInfo}>
                <Text style={styles.infoLabel}>Opening Hours: </Text>
                {selectedService.facilities.openingHours}
              </Text>
              <Text style={styles.facilityInfo}>
                <Text style={styles.infoLabel}>Capacity: </Text>
                {selectedService.facilities.capacity}
              </Text>
              <Text style={styles.facilityInfo}>
                <Text style={styles.infoLabel}>Fee: </Text>
                {selectedService.facilities.fee || 'Free for residents'}
              </Text>
              
              <TouchableOpacity 
                style={styles.bookNowButton}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate('BookingScreen', { facility: selectedService });
                }}
              >
                <Text style={styles.bookNowText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.noDataText}>Facility details unavailable</Text>
          )}
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
              <Text style={styles.userName}>{communityData?.name || 'Our Community'}</Text>
              <Text style={styles.welcomeText}>{userData?.displayName || 'Resident'}</Text>
            </View>
          </View>

          {userData?.role === 'Admin' && (
            <TouchableOpacity style={styles.switchButton} onPress={() => navigation.navigate('AdminDashboard')}>
              <Text style={styles.switchButtonText}>Switch to Admin</Text>
            </TouchableOpacity>
          )}
        </View>


        {/* Gate Pass Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gate Pass</Text>
          </View>
          <View style={styles.cardRow}>
            <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('GatePassScreen')}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#f5f5f5' }]}>
                <Icon name="qrcode-plus" size={28} color="#366732" />
              </View>
              <Text style={styles.featureText}>Generate Gate Pass</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('GatePassHistoryScreen')}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#f5f5f5' }]}>
                <Icon name="history" size={28} color="#366732" />
              </View>
              <Text style={styles.featureText}>My Passes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bills & Payments Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bills & Payments</Text>
          </View>
          <View style={styles.cardRow}>
            <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('MaintenanceScreen')}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#fff8e1' }]}>
                <Icon name="credit-card-check" size={28} color="#f68422" />
              </View>
              <Text style={styles.featureText}>Maintenance Payment</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('PaymentHistoryScreen')}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#fff8e1' }]}>
                <Icon name="account-cash-outline" size={28} color="#f68422" />
              </View>
              <Text style={styles.featureText}>Payment History</Text>
            </TouchableOpacity>
          </View>
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
                <TouchableOpacity style={styles.callButton} onPress={() => Linking.openURL(`tel:${contact.number}`)}>
                  <Icon name="phone" size={19} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Home Store Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Home Store</Text>
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

        {/* Bookings Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bookings</Text>
            {bookingsCategories.length > 8 && (
              <TouchableOpacity onPress={() => setShowAllBookings(!showAllBookings)}>
                <Text style={styles.seeAll}>
                  {showAllBookings ? 'Show Less' : 'See All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={bookingsCategories}
            renderItem={renderBookingsServiceCards}
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            {renderServiceDetails()}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#366732',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 3,
    marginBottom: 20,
    paddingTop:33
  },
  switchButton:{
    backgroundColor: '#E6F2EA', 
    padding: 8, 
    borderRadius: 6,
    alignSelf: 'flex-end',
    marginTop:-20
  },
  switchButtonText: {
    color: '#366732',
    fontWeight: 'bold',
    fontSize: 14,
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
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  communityName: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
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
    color: '#366732',
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
  bookingsServiceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
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
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  modalContent: {
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 15,
  },
  
  // Vendor details styles
  vendorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  vendorCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  vendorInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  vendorContact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vendorPhone: {
    fontSize: 14,
    color: '#366732',
    fontWeight: '500',
  },
  
  // Facility details styles
  facilityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  facilityDetails: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
  },
  facilityInfo: {
    fontSize: 15,
    color: '#555',
    marginBottom: 10,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#333',
  },
  bookNowButton: {
    backgroundColor: '#366732',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  bookNowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 15,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  }
});

export default ResidentDashboard;