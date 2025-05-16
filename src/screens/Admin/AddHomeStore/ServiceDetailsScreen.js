// ServiceDetailsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';

const ServiceDetailsScreen = ({ navigation }) => {
  const route = useRoute();
  const { serviceId } = route.params;
  const communityData = useSelector((state) => state.user.communityData);
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const doc = await firestore()
          .collection('communities')
          .doc(communityData.id)
          .collection('homeStoreCategories')
          .doc(serviceId)
          .get();

        if (doc.exists) {
          setService({
            id: doc.id,
            ...doc.data(),
          });
        }
      } catch (error) {
        console.error('Error fetching service:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [serviceId, communityData.id]);

  const handleAddVendor = () => {
    navigation.navigate('AddVendor', { serviceId });
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#366732" />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.container}>
        <Text>Service not found</Text>
      </View>
    );
  }

  return (
    <View style={{flex:1}}>

      <View style={styles.mainHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Service</Text>
      </View>

    <View style={styles.container}>

      <View style={styles.header}>
        <Icon name={service.icon} size={40} color="#366732" />
        <Text style={styles.serviceName}>{service.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vendors ({service.vendors?.length || 0})</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddVendor}
        >
          <Icon name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Vendor</Text>
        </TouchableOpacity>

        {service.vendors?.length > 0 ? (
          <FlatList
            data={service.vendors}
            keyExtractor={(item) => item.vendorId}
            renderItem={({ item }) => (
              <View style={styles.vendorCard}>
                <Text style={styles.vendorName}>{item.name}</Text>
                <Text style={styles.vendorPhone}>{item.phone}</Text>
                <View style={styles.vendorRating}>
                  <Icon name="star" size={16} color="#FFC107" />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
                <Text style={styles.vendorServices}>
                  {item.services?.join(', ')}
                </Text>
              </View>
            )}
          />
        ) : (
          <Text style={styles.emptyText}>No vendors added yet</Text>
        )}
      </View>
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    padding: 20,
  },
  mainHeader: {
    backgroundColor: '#366732',
    padding: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    marginRight: 35
  },
  backIconButton: {
    padding: 8, 
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
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
  vendorCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  vendorPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  vendorRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingText: {
    marginLeft: 5,
    color: '#666',
  },
  vendorServices: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
});

export { ServiceDetailsScreen };