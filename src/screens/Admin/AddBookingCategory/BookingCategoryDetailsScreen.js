// BookingCategoryDetailsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import { ScrollView } from 'react-native-gesture-handler';

const BookingCategoryDetailsScreen = ({ navigation }) => {
  const route = useRoute();
  const { categoryId } = route.params;
  const communityData = useSelector((state) => state.user.communityData);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
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
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Category Details</Text>
      </View>

      <ScrollView>
        <View style={styles.container}>
          <View style={styles.itemHeader}>
            <Icon name={category.icon} size={40} color="#366732" />
            <Text style={styles.categoryName}>{category?.name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="account-group" size={20} color="#666" />
            <Text style={styles.detailText}>Capacity: {category?.facilities?.capacity}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="clock-outline" size={20} color="#666" />
            <Text style={styles.detailText}>Hours: {category?.facilities?.openingHours}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="cash" size={20} color="#666" />
            <Text style={styles.detailText}>Fee: {category?.facilities?.fee}</Text>
          </View>

          {category?.facilities?.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{category?.facilities?.description}</Text>
            </View>
          )}

          {category?.facilities?.rules?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rules</Text>
              {category?.facilities?.rules.map((rule, index) => (
                <View key={index} style={styles.ruleItem}>
                  <Icon name="check-circle" size={16} color="#366732" />
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          )}

          {category?.facilities?.equipment?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Equipment</Text>
              <View style={styles.equipmentContainer}>
                {category?.facilities?.equipment.map((item, index) => (
                  <View key={index} style={styles.equipmentItem}>
                    <Text style={styles.equipmentText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditBookingCategory', { categoryId })}
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
    padding: 20,
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
  iconButton: {
    padding: 8,
  },
  itemHeader: {
    alignItems: 'center',
    marginBottom: 20,
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
  categoryName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  equipmentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  equipmentItem: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    elevation: 1,
  },
  equipmentText: {
    fontSize: 12,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#366732',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export { BookingCategoryDetailsScreen };