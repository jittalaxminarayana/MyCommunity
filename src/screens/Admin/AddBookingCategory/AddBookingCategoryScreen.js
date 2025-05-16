// AddBookingCategoryScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';

const AddBookingCategoryScreen = () => {
  const navigation = useNavigation();
  const communityData = useSelector((state) => state.user.communityData);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('calendar-blank');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !capacity.trim()) {
      alert('Please fill required fields');
      return;
    }

    setSaving(true);
    try {
      await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('bookingsCategories')
        .add({
          name,
          icon,
          description,
          capacity: parseInt(capacity),
          openingHours: openingHours || 'Not specified',
          fee: fee || 'Free for residents',
          rules: [],
          equipment: [],
          minBookingDuration: 30,
          maxBookingDuration: 120,
          advanceBookingLimit: 7,
          requiresStaffApproval: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      navigation.goBack();
    } catch (error) {
      console.error('Error adding booking category:', error);
      alert('Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  const icons = [
    'dumbbell', 'badminton', 'pool', 'tennis',
    'stadium', 'home-group', 'calendar-blank', 'basketball'
  ];

  return (
    <View style={{flex:1}}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Category</Text>
      </View>

      <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Facility Name*</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Gym, Badminton Court"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Select Icon</Text>
        <View style={styles.iconGrid}>
          {icons.map((iconName) => (
            <TouchableOpacity
              key={iconName}
              style={[
                styles.iconButton,
                icon === iconName && styles.selectedIcon
              ]}
              onPress={() => setIcon(iconName)}
            >
              <Icon name={iconName} size={30} color="#366732" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Brief description of the facility"
          multiline
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Capacity*</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 20"
          keyboardType="numeric"
          value={capacity}
          onChangeText={setCapacity}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Opening Hours</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 06:00 - 22:00"
          value={openingHours}
          onChangeText={setOpeningHours}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Fee Structure</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Free for residents or $10/hour"
          value={fee}
          onChangeText={setFee}
        />
      </View>

      <TouchableOpacity 
        style={styles.saveButton} 
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Facility</Text>
        )}
      </TouchableOpacity>
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
  header: {
    backgroundColor: '#366732',
    padding: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    elevation: 2,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
  },
  selectedIcon: {
    borderWidth: 2,
    borderColor: '#366732',
  },
  saveButton: {
    backgroundColor: '#366732',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom:30
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export { AddBookingCategoryScreen };