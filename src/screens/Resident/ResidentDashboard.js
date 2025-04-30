import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';

const ResidentDashboard = ({ navigation }) => {
  const userData = useSelector((state) => state?.user?.userData);
  const communityData = useSelector((state) => state?.user?.communityData);

  // Emergency contacts data
  const emergencyContacts = [
    { id: '1', name: 'Security', number: '080-12345678', icon: 'shield-home' },
    { id: '2', name: 'Admin Office', number: '080-87654321', icon: 'office-building' },
    { id: '3', name: 'Lift Emergency', number: '1800-123-456', icon: 'elevator' },
    { id: '4', name: 'Electrician', number: '080-11223344', icon: 'flash' },
    { id: '5', name: 'Plumber', number: '080-55667788', icon: 'pipe' },
  ];

  // Home store categories
  const homeStoreCategories = [
    { id: '1', name: 'Painting', icon: 'brush' },
    { id: '2', name: 'Plumbing', icon: 'pipe' },
    { id: '3', name: 'Pest Control', icon: 'bug' },
    { id: '4', name: 'Service Repair', icon: 'tools' },
    { id: '5', name: 'Packers & Movers', icon: 'truck-delivery' },
    { id: '6', name: 'Healthcare', icon: 'medical-bag' },
    { id: '7', name: 'Automobile', icon: 'car' },
    { id: '8', name: 'Vegtables', icon: 'sprout' },
  ];

  const BookingsCategories = [
    { id: '1', name: 'Hall', icon: 'home-city-outline' },
    { id: '2', name: 'Gym', icon: 'weight-lifter' },
    { id: '3', name: 'Badminton Court', icon: 'badminton' },
  ];

  const renderHomeServiceCard = ({ item }) => (
    <TouchableOpacity style={styles.serviceCard}>
      <View style={styles.homeServiceIconContainer}>
        <Icon name={item.icon} size={28} color="#f68422" />
      </View>
      <Text style={styles.serviceName}>{item.name}</Text>
    </TouchableOpacity>
  );
  const renderBookingsServiceCards = ({ item }) => (
    <TouchableOpacity style={styles.serviceCard}>
      <View style={styles.bookingsServiceIconContainer}>
        <Icon name={item.icon} size={28} color="#366732" />
      </View>
      <Text style={styles.serviceName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
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
      </View>

      {/* Gate Pass Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gate Pass</Text>
          {/* <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity> */}
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
          {/* <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity> */}
        </View>
        <View style={styles.cardRow}>
          <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('MaintenancePayment')}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#fff8e1' }]}>
              <Icon name="credit-card-check" size={28} color="#f68422" />
            </View>
            <Text style={styles.featureText}>Maintenance Payment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('PaymentHistory')}>
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
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emergencyList}>
          {emergencyContacts.map(contact => (
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
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
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
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={BookingsCategories}
          renderItem={renderBookingsServiceCards}
          keyExtractor={item => item.id}
          numColumns={4}
          columnWrapperStyle={styles.serviceRow}
          scrollEnabled={false}
          contentContainerStyle={styles.serviceContainer}
        />
      </View>
    </ScrollView>
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
});

export default ResidentDashboard;