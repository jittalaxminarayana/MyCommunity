// BookingCategoryDetailsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image,
  Platform,
  Dimensions
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import { ScrollView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');
const imageWidth = width - 40; // Full width minus padding

const BookingCategoryDetailsScreen = ({ navigation }) => {
  const route = useRoute();
  const { categoryId } = route.params;
  const communityData = useSelector((state) => state.user.communityData);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  console.log("BookingCategoryDetails", category);

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const doc = await firestore()
          .collection('communities')
          .doc(communityData.id)
          .collection('bookingsCategories')
          .doc(categoryId)
          .get();

        if (doc.exists) {
          setCategory({
            id: doc.id,
            ...doc.data(),
          });
        }
      } catch (error) {
        console.error('Error fetching category:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId, communityData.id]);

  const nextImage = () => {
    if (category?.images && category.images.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === category.images.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const prevImage = () => {
    if (category?.images && category.images.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? category.images.length - 1 : prevIndex - 1
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#366732" />
      </View>
    );
  }

  if (!category) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Category Details</Text>
        </View>
        <View style={styles.notFoundMessageContainer}>
          <Text style={styles.notFoundText}>Category not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Category Details</Text>
      </View>

      <ScrollView>
        <View style={styles.container}>
          {/* Image Carousel */}
          {category.images && category.images.length > 0 ? (
            <View style={styles.imageCarouselContainer}>
              <Image 
                source={{ uri: category.images[currentImageIndex] }} 
                style={styles.facilityImage} 
                resizeMode="cover"
              />
              
              {category.images.length > 1 && (
                <View style={styles.carouselControls}>
                  <TouchableOpacity onPress={prevImage} style={styles.carouselButton}>
                    <Icon name="chevron-left" size={30} color="#fff" />
                  </TouchableOpacity>
                  
                  <View style={styles.paginationDots}>
                    {category.images.map((_, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.paginationDot, 
                          currentImageIndex === index && styles.activePaginationDot
                        ]} 
                      />
                    ))}
                  </View>
                  
                  <TouchableOpacity onPress={nextImage} style={styles.carouselButton}>
                    <Icon name="chevron-right" size={30} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noImageContainer}>
              <Icon name={category.icon} size={80} color="#366732" />
            </View>
          )}

          <View style={styles.categoryCard}>
            <View style={styles.itemHeader}>
              <View style={styles.iconContainer}>
                <Icon name={category.icon} size={32} color="#366732" />
              </View>
              <Text style={styles.categoryName}>{category?.name}</Text>
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Icon name="account-group" size={20} color="#666" />
                <Text style={styles.detailText}>Capacity: {category?.capacity}</Text>
              </View>

              <View style={styles.detailRow}>
                <Icon name="clock-outline" size={20} color="#666" />
                <Text style={styles.detailText}>Hours: {category?.openingHours}</Text>
              </View>

              <View style={styles.detailRow}>
                <Icon name="cash" size={20} color="#666" />
                <Text style={styles.detailText}>Fee: {category?.fee}</Text>
              </View>
            </View>
          </View>

          {/* Booking Configuration Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Booking Configuration</Text>
            
            <View style={styles.configRow}>
              <View style={styles.configItem}>
                <Icon name="clock-time-four-outline" size={22} color="#366732" />
                <Text style={styles.configLabel}>Min Duration</Text>
                <Text style={styles.configValue}>{category?.minBookingDuration || 30} mins</Text>
              </View>
              
              <View style={styles.configItem}>
                <Icon name="clock-time-eight-outline" size={22} color="#366732" />
                <Text style={styles.configLabel}>Max Duration</Text>
                <Text style={styles.configValue}>{category?.maxBookingDuration || 120} mins</Text>
              </View>
            </View>
            
            <View style={styles.configRow}>
              <View style={styles.configItem}>
                <Icon name="calendar-range" size={22} color="#366732" />
                <Text style={styles.configLabel}>Book in Advance</Text>
                <Text style={styles.configValue}>{category?.advanceBookingLimit || 7} days</Text>
              </View>
              
              <View style={styles.configItem}>
                <Icon name="account-check" size={22} color="#366732" />
                <Text style={styles.configLabel}>Staff Approval</Text>
                <Text style={styles.configValue}>
                  {category?.requiresStaffApproval ? 'Required' : 'Not Required'}
                </Text>
              </View>
            </View>
          </View>

          {/* Description Card */}
          {category?.description && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Description</Text>
              <Text style={styles.descriptionText}>{category?.description}</Text>
            </View>
          )}

          {/* Rules Card */}
          {category?.rules?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rules</Text>
              {category?.rules.map((rule, index) => (
                <View key={index} style={styles.ruleItem}>
                  <Icon name="shield-check" size={18} color="#366732" />
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Equipment Card */}
          {category?.equipment?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Equipment</Text>
              <View style={styles.equipmentContainer}>
                {category?.equipment.map((item, index) => (
                  <View key={index} style={styles.equipmentItem}>
                    <Icon name="dumbbell" size={14} color="#366732" />
                    <Text style={styles.equipmentText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditBookingCategoryScreen', { categoryId })}
          >
            <Text style={styles.editButtonText}>Edit Details</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  notFoundMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  notFoundText: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCarouselContainer: {
    width: '100%',
    height: 220,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  facilityImage: {
    width: '100%',
    height: '100%',
  },
  carouselControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  carouselButton: {
    padding: 5,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  activePaginationDot: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  noImageContainer: {
    height: 180,
    backgroundColor: '#e9f5e8',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  iconContainer: {
    backgroundColor: '#e9f5e8',
    padding: 10,
    borderRadius: 10,
    marginRight: 15,
  },
  categoryName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  detailsContainer: {
    paddingTop: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#555',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 18,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#366732',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  descriptionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ruleText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#555',
    flex: 1,
    lineHeight: 20,
  },
  equipmentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  equipmentItem: {
    backgroundColor: '#f5f9f4',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  equipmentText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 6,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  configItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f5f9f4',
    borderRadius: 10,
    marginHorizontal: 5,
  },
  configLabel: {
    fontSize: 12,
    color: '#777',
    marginTop: 5,
  },
  configValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#366732',
    marginTop: 3,
  },
  editButton: {
    backgroundColor: '#366732',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export { BookingCategoryDetailsScreen };