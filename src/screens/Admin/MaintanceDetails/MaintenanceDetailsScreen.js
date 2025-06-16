import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import CustomAlert from '../../../components/CustomAlert';

const MaintenanceDetailsScreen = ({ navigation }) => {
  const route = useRoute();
  const { block } = route.params;
  const communityData = useSelector((state) => state.user.communityData);
  const [loading, setLoading] = useState(true);
  const [maintenanceList, setMaintenanceList] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState(null); // Store selected item ID
  const [alerts, setAlerts] = useState({
    confirmation: false,
    success: false,
    error: false,
  });

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();
  const currentMonthKey = `${currentMonth} ${currentYear}`;

  const showAlert = (type) => {
    setAlerts(prev => ({ ...prev, [type]: true }));
  };

  const hideAlert = (type) => {
    setAlerts(prev => ({ ...prev, [type]: false }));
  };

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('communities')
      .doc(communityData.id)
      .collection('maintenanceDues')
      .where('apartmentId', '>=', `${block}-`)
      .where('apartmentId', '<=', `${block}-\uf8ff`)
      .onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dueDate: doc.data().dueDate?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
        }));
        
        // Filter for current month only
        const currentMonthData = data.filter(item => 
          item.month === currentMonthKey
        );
        
        setMaintenanceList(currentMonthData);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching maintenance:', error);
        setLoading(false);
        showAlert('error');
      });

    return () => unsubscribe();
  }, [block, communityData.id]);

  const filteredData = maintenanceList.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const markAsPaid = async (id) => {
    try {
      await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('maintenanceDues')
        .doc(id)
        .update({
          status: 'paid',
          updatedAt: firestore.FieldValue.serverTimestamp()
        });

      const updatedList = maintenanceList.map(item =>
        item.id === id ? { ...item, status: 'paid' } : item
      );
      setMaintenanceList(updatedList);
      showAlert('success');
    } catch (error) {
      console.error('Error updating payment:', error);
      showAlert('error');
    }
  };

  const confirmMarkPaid = (id) => {
    setSelectedItemId(id); // Store the ID for later use
    showAlert('confirmation');
  };

  const handleConfirmPayment = () => {
    if (selectedItemId) {
      markAsPaid(selectedItemId);
      setSelectedItemId(null);
    }
    hideAlert('confirmation');
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Maintenance - {currentMonthKey}</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'pending' && styles.activeFilter]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'paid' && styles.activeFilter]}
            onPress={() => setFilter('paid')}
          >
            <Text style={[styles.filterText, filter === 'paid' && styles.activeFilterText]}>Paid</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#366732" style={styles.loader} />
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.apartmentText}>Apartment {item.apartmentId}</Text>
                  <View style={[styles.statusBadge,
                    item.status === 'paid' ? styles.paidBadge :
                    item.status === 'overdue' ? styles.overdueBadge : styles.pendingBadge
                  ]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.detailRow}>
                    <Icon name="account" size={20} color="#666" />
                    <Text style={styles.detailText}>{item.userName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon name="calendar-month" size={20} color="#666" />
                    <Text style={styles.detailText}>{item.month}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon name="cash" size={20} color="#666" />
                    <Text style={styles.detailText}>₹{item.amount.toLocaleString()}</Text>
                  </View>
                </View>

                {item.status !== 'paid' && (
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => confirmMarkPaid(item.id)}
                  >
                    <Text style={styles.payButtonText}>Mark as Paid</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No maintenance records for {currentMonthKey}</Text>
              </View>
            }            
          />
        )}
      </View>

      {/* Custom Alert Components */}
      <CustomAlert
        visible={alerts.confirmation}
        title="Confirm Payment"
        message="Are you sure you want to mark this maintenance as paid?"
        cancelText="Cancel"
        okText="Yes"
        onOk={handleConfirmPayment}
        onCancel={() => hideAlert('confirmation')}
        showProceed={false}
        alertType="warning"
      />

      <CustomAlert
        visible={alerts.success}
        title="Success!"
        message="Maintenance has been marked as paid successfully."
        onOk={() => hideAlert('success')}
        okText="Great!"
        showCancel={false}
        showProceed={false}
        alertType="success"
      />

      <CustomAlert
        visible={alerts.error}
        title="Error"
        message="Something went wrong. Please try again."
        onOk={() => hideAlert('error')}
        okText="Retry"
        showCancel={false}
        showProceed={false}
        alertType="error"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    padding: 12,
  },
  header: {
    backgroundColor: '#366732',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  iconButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    justifyContent: 'space-around',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  activeFilter: {
    backgroundColor: '#366732',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
  },
  activeFilterText: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  apartmentText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  pendingBadge: {
    backgroundColor: '#FFECB3',
  },
  paidBadge: {
    backgroundColor: '#C8E6C9',
  },
  overdueBadge: {
    backgroundColor: '#FFCDD2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  cardBody: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    marginLeft: 10,
    color: '#666',
  },
  payButton: {
    backgroundColor: '#366732',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  payButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  loader: {
    marginTop: 20,
  },
});

export default MaintenanceDetailsScreen;