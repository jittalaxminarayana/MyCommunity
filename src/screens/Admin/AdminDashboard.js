import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Image, BackHandler,Alert} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';

const AdminDashboard = () => {
  const navigation = useNavigation();
  const userData = useSelector((state) => state.user.userData);
  const communityData = useSelector((state) => state.user.communityData);
  
  const [activeSection, setActiveSection] = useState('maintenance');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [maintenanceSummary, setMaintenanceSummary] = useState({
    totalCollected: 0,
    pendingPayments: 0
  });
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  console.log("emergencyContacts", emergencyContacts)
  const [homeStoreCategories, setHomeStoreCategories] = useState([]);
  const [bookingsCategories, setBookingsCategories] = useState([]);

  useEffect(() => {
    if (!communityData?.id) return;
  
    const communityRef = firestore().collection('communities').doc(communityData.id);
  
    const unsubscribeEmergency = communityRef
      .collection('emergencyContacts')
      .onSnapshot(snapshot => {
        const contacts = snapshot.docs.map(doc => ({
          id2: doc.id,
          ...doc.data()
        }));
        setEmergencyContacts(contacts);
      });
  
    const unsubscribeBookings = communityRef
      .collection('bookingsCategories')
      .onSnapshot(snapshot => {
        const bookings = snapshot.docs.map(doc => ({
          id2: doc.id,
          ...doc.data()
        }));
        setBookingsCategories(bookings);
      });
  
    const unsubscribeHomeStore = communityRef
      .collection('homeStoreCategories')
      .onSnapshot(snapshot => {
        const homeCategories = snapshot.docs.map(doc => ({
          id2: doc.id,
          ...doc.data()
        }));
        setHomeStoreCategories(homeCategories);
      });
  
    const unsubscribeMaintenanceDues = communityRef
      .collection('maintenanceDues')
      .onSnapshot(async maintenanceDuesSnap => {
        const maintenancePaymentsSnap = await communityRef.collection('payments').get(); // still using get() if payments is not needed to be real-time
  
        const blockData = {};
        let totalPending = 0;
        let totalCollected = 0;
  
        maintenanceDuesSnap.docs.forEach(doc => {
          const data = doc.data();
          const blockId = data.apartmentId.split('-')[0];
  
          if (!blockData[blockId]) {
            blockData[blockId] = {
              block: blockId,
              pending: 0,
              paid: 0,
              total: 0
            };
          }
  
          if (data.status === 'pending' || data.status === 'overdue') {
            blockData[blockId].pending++;
            totalPending += data.amount;
          } else if (data.status === 'paid') {
            blockData[blockId].paid++;
            totalCollected += data.amount;
          }
  
          blockData[blockId].total++;
        });
  
        const blocks = Object.values(blockData).sort((a, b) => a.block.localeCompare(b.block));
        setMaintenanceData(blocks);
  
        setMaintenanceSummary({
          totalCollected,
          pendingPayments: totalPending
        });
  
        setLoading(false);
      });
  
    return () => {
      unsubscribeEmergency();
      unsubscribeBookings();
      unsubscribeHomeStore();
      unsubscribeMaintenanceDues();
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

  // Content section components for FlatList
  const renderMaintenanceSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Maintenance Management</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#366732" style={styles.loader} />
      ) : (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Collected</Text>
              <Text style={styles.summaryValue}>₹{maintenanceSummary.totalCollected.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Pending Payments</Text>
              <Text style={[styles.summaryValue, { color: '#FF5722' }]}>₹{maintenanceSummary.pendingPayments.toLocaleString()}</Text>
            </View>
          </View>

          {maintenanceData.length > 0 ? (
            <FlatList
              data={maintenanceData}
              keyExtractor={(item) => item.block}
              renderItem={({ item }) => (
                <View style={styles.blockCard}>
                  <Text style={styles.blockTitle}>Block {item.block}</Text>
                  <View style={styles.blockRow}>
                    <Text>Pending: {item.pending}</Text>
                    <Text>Paid: {item.paid}</Text>
                    <Text>Total: {item.total}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.viewButton}
                    onPress={() => navigation.navigate('MaintenanceDetailsScreen', { block: item.block })}
                  >
                    <Text style={styles.viewButtonText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              )}
              scrollEnabled={false}
              nestedScrollEnabled={true}
            />
          ) : (
            <Text style={styles.noDataText}>No maintenance data available</Text>
          )}
        </>
      )}
    </View>
  );

  const renderEmergencyContactsSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Emergency Contacts</Text>
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('AddEmergencyContactScreen')}
      >
        <Icon name="plus" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add Contact</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#366732" style={styles.loader} />
      ) : emergencyContacts.length > 0 ? (
        <FlatList
          data={emergencyContacts}
          keyExtractor={(item) => item.id2}
          renderItem={({ item }) => (
            <View style={styles.contactCard}>
              <View style={styles.contactIcon}>
                <Icon 
                  name={
                    item.category === 'fire' ? 'fire-truck' :
                    item.category === 'police' ? 'police-badge' :
                    item.category === 'medical' ? 'ambulance' :
                    item.category === 'plumbing' ? 'water-pump' :
                    item.category === 'electrical' ? 'flash' :
                    'phone-alert'
                  } 
                  size={24} 
                  color="#366732" 
                />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactNumber}>{item.number}</Text>
              </View>
              <TouchableOpacity 
                style={styles.contactAction}
                onPress={() => navigation.navigate('EditEmergencyContactScreen', { contactId: item.id2 })}
              >
                <Icon name="dots-vertical" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          )}
          scrollEnabled={false}
          nestedScrollEnabled={true}
        />
      ) : (
        <Text style={styles.noDataText}>No emergency contacts available</Text>
      )}
    </View>
  );

  const renderHomeStoreSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Home Store Services</Text>
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('AddHomeStoreServiceScreen')}
      >
        <Icon name="plus" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add Service</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#366732" style={styles.loader} />
      ) : homeStoreCategories.length > 0 ? (
        <View style={styles.serviceGrid}>
          {homeStoreCategories.map((category) => (
            <TouchableOpacity 
              key={category.id2}
              style={styles.serviceCard}
              onPress={() => navigation.navigate('ServiceDetailsScreen', { serviceId: category.id2 })}
            >
              <View style={styles.serviceIcon}>
                <Icon 
                  name={category.icon || 'store'} 
                  size={30} 
                  color="#366732" 
                />
              </View>
              <Text style={styles.serviceName}>{category.name}</Text>
              <Text style={styles.serviceVendors}>
                {category.vendors ? `${category.vendors.length} vendors` : 'No vendors'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.noDataText}>No services available</Text>
      )}
    </View>
  );

  const renderBookingsSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Booking Categories</Text>
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('AddBookingCategoryScreen')}
      >
        <Icon name="plus" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add Category</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#366732" style={styles.loader} />
      ) : bookingsCategories.length > 0 ? (
        <FlatList
          data={bookingsCategories}
          keyExtractor={(item) => item.id2}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.bookingCard}
              onPress={() => navigation.navigate('BookingCategoryDetailsScreen', { categoryId: item.id2 })}
            >
              <View style={styles.bookingIcon}>
                <Icon 
                  name={item.icon || 'calendar-blank'} 
                  size={24} 
                  color="#366732" 
                />
              </View>
              <Text style={styles.bookingName}>{item.name}</Text>
              <Icon name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          )}
          scrollEnabled={false}
          nestedScrollEnabled={true}
        />
      ) : (
        <Text style={styles.noDataText}>No booking categories available</Text>
      )}
    </View>
  );

  // Create data structure for main FlatList based on active section
  const getSectionData = () => {
    if (activeSection === 'maintenance') {
      return [{ id: 'maintenance', component: renderMaintenanceSection }];
    } else if (activeSection === 'emergency') {
      return [{ id: 'emergency', component: renderEmergencyContactsSection }];
    } else if (activeSection === 'store') {
      return [{ id: 'store', component: renderHomeStoreSection }];
    } else if (activeSection === 'bookings') {
      return [{ id: 'bookings', component: renderBookingsSection }];
    }
    return [];
  };

  return (
    <View style={styles.container}>
      {/* Header with Community Info and Switch Button */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={userData?.photoURL ? { uri: userData.photoURL } : require('../../../assets/community.png')}
            style={styles.userAvatar}
          />
          <View style={styles.userTextContainer}>
            <Text style={styles.headerTitle}>{communityData?.name || 'Community'} Admin</Text>
            <Text style={styles.headerSubtitle}>{userData?.name || userData?.displayName || 'Admin'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.switchButton} onPress={() => navigation.navigate('ResidentDashboard')}>
          <Text style={styles.switchButtonText}>Switch to Resident</Text>
        </TouchableOpacity>
      </View>
  
      {/* Admin Navigation */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navContainer}>
        <TouchableOpacity 
          style={[styles.navItem, activeSection === 'maintenance' && styles.activeNavItem]}
          onPress={() => setActiveSection('maintenance')}
        >
          <Icon name="cash" size={24} color={activeSection === 'maintenance' ? '#366732' : '#666'} />
          <Text style={[styles.navText, activeSection === 'maintenance' && styles.activeNavText]}>Maintenance</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, activeSection === 'bookings' && styles.activeNavItem]}
          onPress={() => setActiveSection('bookings')}
        >
          <Icon name="calendar" size={24} color={activeSection === 'bookings' ? '#366732' : '#666'} />
          <Text style={[styles.navText, activeSection === 'bookings' && styles.activeNavText]}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, activeSection === 'emergency' && styles.activeNavItem]}
          onPress={() => setActiveSection('emergency')}
        >
          <Icon name="phone" size={24} color={activeSection === 'emergency' ? '#366732' : '#666'} />
          <Text style={[styles.navText, activeSection === 'emergency' && styles.activeNavText]}>Emergency</Text>
        </TouchableOpacity>
  
        <TouchableOpacity 
          style={[styles.navItem, activeSection === 'store' && styles.activeNavItem]}
          onPress={() => setActiveSection('store')}
        >
          <Icon name="store" size={24} color={activeSection === 'store' ? '#366732' : '#666'} />
          <Text style={[styles.navText, activeSection === 'store' && styles.activeNavText]}>Home Store</Text>
        </TouchableOpacity>
  
        

      </ScrollView>
  
      {/* Content Section */}
      <FlatList
        style={styles.contentContainer}
        data={getSectionData()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => item.component()}
        nestedScrollEnabled={true}
      />
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
    marginTop:15
  },
  userTextContainer: {
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
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
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#366732',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#366732',
    fontWeight: 'bold',
  },
  navContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexGrow:0
  },
  navItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  activeNavItem: {
    borderBottomWidth: 2,
    borderBottomColor: '#366732',
    backgroundColor:'#f5f5f5',
    borderRadius:8,
  },
  navText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  activeNavText: {
    color: '#366732',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    elevation: 2,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#366732',
    marginTop: 5,
  },
  blockCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  blockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  viewButton: {
    backgroundColor: '#366732',
    padding: 8,
    borderRadius: 5,
    alignSelf: 'flex-end',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#366732',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '500',
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  contactIcon: {
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  contactNumber: {
    fontSize: 14,
    color: '#666',
  },
  contactAction: {
    padding: 5,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  serviceIcon: {
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  serviceVendors: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  bookingIcon: {
    marginRight: 15,
  },
  bookingName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  loader: {
    marginVertical: 20,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  }
});

export default AdminDashboard;