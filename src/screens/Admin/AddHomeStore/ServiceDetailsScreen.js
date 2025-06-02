import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import { ScrollView } from 'react-native-gesture-handler';
import { flingGestureHandlerProps } from 'react-native-gesture-handler/lib/typescript/handlers/FlingGestureHandler';

const ServiceDetailsScreen = ({ navigation }) => {
  const route = useRoute();
  const { serviceId } = route.params;
  const communityData = useSelector((state) => state.user.communityData);
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscriber = firestore()
      .collection('communities')
      .doc(communityData.id)
      .collection('homeStoreCategories')
      .doc(serviceId)
      .onSnapshot({
        next: (documentSnapshot) => {
          if (documentSnapshot.exists) {
            setService({
              id: documentSnapshot.id,
              ...documentSnapshot.data(),
            });
          }
          setLoading(false);
        },
        error: (error) => {
          console.error('Error fetching service:', error);
          setLoading(false);
        }
      });

    // Unsubscribe from snapshot listener when component unmounts
    return () => subscriber();
  }, [serviceId, communityData.id]);

  const handleAddVendor = () => {
    navigation.navigate('AddVendorScreen', { serviceId });
  };

  const handleVendorPress = (vendor) => {
    navigation.navigate('EditVendorScreen', { vendor, serviceId });
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
        <Text style={styles.headerTitle}>Vendors Details</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.header}>
          <Icon name={service.icon} size={40} color="#366732" />
          <Text style={styles.serviceName}>{service.name}</Text>
        </View>

        <View style={styles.section}>
        <ScrollView
            style={{ marginBottom: 60 }}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vendors ({service.vendors?.length || 0})</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddVendor}
            >
              <Icon name="plus" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Vendor</Text>
            </TouchableOpacity>
          </View>

          {service.vendors?.length > 0 ? (
            <FlatList
              data={service.vendors}
              keyExtractor={(item) => item.vendorId}
              renderItem={({ item }) => (
                <View style={styles.vendorCard}>
                  <View style={styles.vendorHeader}>
                    <Text style={styles.vendorName}>{item.name}</Text>
                    {item.isVerified && (
                      <Icon name="check-decagram" size={20} color="#366732" />
                    )}
                  </View>
              
                  {item.images && item.images.length > 0 && (
                    <Image 
                      source={{ uri: item.images[0] }} 
                      style={styles.vendorImage} 
                      resizeMode="cover"
                    />
                  )}
              
                  {/* Rating */}
                  <View style={styles.vendorInfoRow}>
                    <Icon name="star" size={16} color="#FFC107" />
                    <Text style={styles.vendorInfoText}>{item.rating || 'New'}</Text>
                  </View>
              
                  {/* Phone */}
                  <View style={styles.vendorInfoRow}>
                    <Icon name="phone" size={16} color="#888" />
                    <Text style={styles.vendorInfoText}>{item.phone}</Text>
                  </View>
              
                  {/* Services */}
                  <View style={styles.vendorInfoRow}>
                    <Icon name="hammer-wrench" size={16} color="#888" />
                    <Text style={styles.vendorInfoText}>{item.services?.join(', ')}</Text>
                  </View>
              
                  {/* Availability */}
                  <View style={styles.vendorInfoRow}>
                    <Icon name="calendar-clock" size={16} color="#888" />
                    <Text style={styles.vendorInfoText}>
                      {item.availability?.workingDays?.join(', ')} • {item.availability?.hours}
                    </Text>
                  </View>
              
                  {/* Edit Button */}
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleVendorPress(item)}
                  >
                    <Icon name="pencil" size={16} color="#fff" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              
            />
          ) : (
            <Text style={styles.emptyText}>No vendors added yet</Text>
          )}
           </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    padding: 12,
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
  },
  serviceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  section: {
    marginTop: 20,
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
  addButton: {
    backgroundColor: '#366732',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 5,
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
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  vendorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  vendorInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  vendorImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginTop: 10,
  },
  editButton: {
    marginTop: 10,
    backgroundColor: '#366732',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf:'flex-end',
  },
  editButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '500',
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
  vendorAvailability: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
});

export { ServiceDetailsScreen };