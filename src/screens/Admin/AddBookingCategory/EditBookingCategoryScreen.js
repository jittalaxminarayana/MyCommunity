// EditBookingCategoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  Image,
  KeyboardAvoidingView
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useSelector } from 'react-redux';
import * as ImagePicker from 'react-native-image-picker';
import IconSelector from './IconSelector';
import { Formik } from 'formik';
import * as Yup from 'yup';

// Validation schema for the form
const CategorySchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  capacity: Yup.number().required('Capacity is required').positive('Capacity must be positive'),
  openingHours: Yup.string().required('Opening hours are required'),
  fee: Yup.string().required('Fee information is required'),
  description: Yup.string(),
  minBookingDuration: Yup.number().required('Minimum booking duration is required').positive('Duration must be positive'),
  maxBookingDuration: Yup.number().required('Maximum booking duration is required').positive('Duration must be positive')
    .moreThan(Yup.ref('minBookingDuration'), 'Max duration must be greater than min duration'),
  advanceBookingLimit: Yup.number().required('Advance booking limit is required').positive('Limit must be positive'),
});

const EditBookingCategoryScreen = ({ navigation }) => {
  const route = useRoute();
  const { categoryId } = route.params;
  const communityData = useSelector((state) => state.user.communityData);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]);
  const [rules, setRules] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [iconSelectorVisible, setIconSelectorVisible] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('');
  const [newRule, setNewRule] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
          const categoryData = {
            id: doc.id,
            ...doc.data(),
          };
          setCategory(categoryData);
          setSelectedIcon(categoryData.icon);
          setRules(categoryData.rules || []);
          setEquipment(categoryData.equipment || []);
          setImages(categoryData.images || []);
        }
      } catch (error) {
        console.error('Error fetching category:', error);
        Alert.alert('Error', 'Failed to load category details');
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId, communityData.id]);

  const handleIconSelect = (icon) => {
    setSelectedIcon(icon);
    setIconSelectorVisible(false);
  };

  const addRule = () => {
    if (newRule.trim() !== '') {
      setRules([...rules, newRule.trim()]);
      setNewRule('');
    }
  };

  const removeRule = (index) => {
    const updatedRules = [...rules];
    updatedRules.splice(index, 1);
    setRules(updatedRules);
  };

  const addEquipment = () => {
    if (newEquipment.trim() !== '') {
      setEquipment([...equipment, newEquipment.trim()]);
      setNewEquipment('');
    }
  };

  const removeEquipment = (index) => {
    const updatedEquipment = [...equipment];
    updatedEquipment.splice(index, 1);
    setEquipment(updatedEquipment);
  };

  const pickImage = async () => {
    ImagePicker.launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to pick image');
      } else {
        const selectedImage = response.assets[0];
        handleImageUpload(selectedImage);
      }
    });
  };

  const handleImageUpload = async (image) => {
    try {
      setUploading(true);
      const imageUri = Platform.OS === 'ios' ? image.uri.replace('file://', '') : image.uri;
      const filename = imageUri.substring(imageUri.lastIndexOf('/') + 1);
      const storageRef = storage().ref(`communities/${communityData.id}/bookingsCategories/${categoryId}/${filename}`);
      
      const task = storageRef.putFile(imageUri);
      
      // Set up progress tracking
      task.on('state_changed', snapshot => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      });
      
      await task;
      const downloadUrl = await storageRef.getDownloadURL();
      
      setImages([...images, downloadUrl]);
      setUploading(false);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = (index) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
  };

  const handleSave = async (values) => {
    try {
      setSaving(true);
      
      const updatedCategory = {
        ...values,
        icon: selectedIcon,
        rules,
        equipment,
        images,
        requiresStaffApproval: values.requiresStaffApproval,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      
      await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('bookingsCategories')
        .doc(categoryId)
        .update(updatedCategory);
        
      setSaving(false);
      Alert.alert('Success', 'Category updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error updating category:', error);
      Alert.alert('Error', 'Failed to update category');
      setSaving(false);
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
          <Text style={styles.headerTitle}>Edit Category</Text>
        </View>
        <View style={styles.notFoundMessageContainer}>
          <Text style={styles.notFoundText}>Category not found</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Category</Text>
        </View>

        <Formik
          initialValues={{
            name: category.name || '',
            description: category.description || '',
            capacity: category.capacity ? category.capacity.toString() : '0',
            openingHours: category.openingHours || '',
            fee: category.fee || '',
            minBookingDuration: category.minBookingDuration ? category.minBookingDuration.toString() : '30',
            maxBookingDuration: category.maxBookingDuration ? category.maxBookingDuration.toString() : '120',
            advanceBookingLimit: category.advanceBookingLimit ? category.advanceBookingLimit.toString() : '7',
            requiresStaffApproval: category.requiresStaffApproval || false,
          }}
          validationSchema={CategorySchema}
          onSubmit={handleSave}
        >
          {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => (
            <ScrollView style={styles.container}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Basic Information</Text>
                
                {/* Icon Selector */}
                <View style={styles.iconSelector}>
                  <Text style={styles.label}>Category Icon</Text>
                  <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={() => setIconSelectorVisible(true)}
                  >
                    <Icon name={selectedIcon} size={40} color="#366732" />
                  </TouchableOpacity>
                  <Text style={styles.iconName}>{selectedIcon}</Text>
                </View>

                {/* Name */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={values.name}
                    onChangeText={handleChange('name')}
                    onBlur={handleBlur('name')}
                    placeholder="Category Name"
                  />
                  {touched.name && errors.name && (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  )}
                </View>

                {/* Description */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={values.description}
                    onChangeText={handleChange('description')}
                    onBlur={handleBlur('description')}
                    placeholder="Description"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Capacity */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Capacity</Text>
                  <TextInput
                    style={styles.input}
                    value={values.capacity}
                    onChangeText={handleChange('capacity')}
                    onBlur={handleBlur('capacity')}
                    placeholder="Capacity"
                    keyboardType="numeric"
                  />
                  {touched.capacity && errors.capacity && (
                    <Text style={styles.errorText}>{errors.capacity}</Text>
                  )}
                </View>

                {/* Opening Hours */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Opening Hours</Text>
                  <TextInput
                    style={styles.input}
                    value={values.openingHours}
                    onChangeText={handleChange('openingHours')}
                    onBlur={handleBlur('openingHours')}
                    placeholder="e.g. 06:00 - 22:00"
                  />
                  {touched.openingHours && errors.openingHours && (
                    <Text style={styles.errorText}>{errors.openingHours}</Text>
                  )}
                </View>

                {/* Fee */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Fee</Text>
                  <TextInput
                    style={styles.input}
                    value={values.fee}
                    onChangeText={handleChange('fee')}
                    onBlur={handleBlur('fee')}
                    placeholder="e.g. Free for residents or ₹500 per hour"
                  />
                  {touched.fee && errors.fee && (
                    <Text style={styles.errorText}>{errors.fee}</Text>
                  )}
                </View>
              </View>

              {/* Booking Configuration */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Booking Configuration</Text>
                
                {/* Min Booking Duration */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Minimum Booking Duration (minutes)</Text>
                  <TextInput
                    style={styles.input}
                    value={values.minBookingDuration}
                    onChangeText={handleChange('minBookingDuration')}
                    onBlur={handleBlur('minBookingDuration')}
                    placeholder="e.g. 30"
                    keyboardType="numeric"
                  />
                  {touched.minBookingDuration && errors.minBookingDuration && (
                    <Text style={styles.errorText}>{errors.minBookingDuration}</Text>
                  )}
                </View>

                {/* Max Booking Duration */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Maximum Booking Duration (minutes)</Text>
                  <TextInput
                    style={styles.input}
                    value={values.maxBookingDuration}
                    onChangeText={handleChange('maxBookingDuration')}
                    onBlur={handleBlur('maxBookingDuration')}
                    placeholder="e.g. 120"
                    keyboardType="numeric"
                  />
                  {touched.maxBookingDuration && errors.maxBookingDuration && (
                    <Text style={styles.errorText}>{errors.maxBookingDuration}</Text>
                  )}
                </View>

                {/* Advance Booking Limit */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Advance Booking Limit (days)</Text>
                  <TextInput
                    style={styles.input}
                    value={values.advanceBookingLimit}
                    onChangeText={handleChange('advanceBookingLimit')}
                    onBlur={handleBlur('advanceBookingLimit')}
                    placeholder="e.g. 7"
                    keyboardType="numeric"
                  />
                  {touched.advanceBookingLimit && errors.advanceBookingLimit && (
                    <Text style={styles.errorText}>{errors.advanceBookingLimit}</Text>
                  )}
                </View>

                {/* Requires Staff Approval */}
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setFieldValue('requiresStaffApproval', !values.requiresStaffApproval)}
                >
                  <View style={[
                    styles.checkbox,
                    values.requiresStaffApproval && styles.checkboxChecked
                  ]}>
                    {values.requiresStaffApproval && <Icon name="check" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Requires Staff Approval</Text>
                </TouchableOpacity>
              </View>

              {/* Rules */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Rules</Text>
                <View style={styles.rulesContainer}>
                  {rules.map((rule, index) => (
                    <View key={index} style={styles.ruleItem}>
                      <Text style={styles.ruleText}>{rule}</Text>
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => removeRule(index)}
                      >
                        <Icon name="close-circle" size={20} color="#e53935" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View style={styles.addItemContainer}>
                  <TextInput
                    style={styles.addItemInput}
                    value={newRule}
                    onChangeText={setNewRule}
                    placeholder="Add a new rule"
                  />
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={addRule}
                  >
                    <Icon name="plus" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Equipment */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Equipment</Text>
                <View style={styles.equipmentContainer}>
                  {equipment.map((item, index) => (
                    <View key={index} style={styles.equipmentChip}>
                      <Text style={styles.equipmentText}>{item}</Text>
                      <TouchableOpacity 
                        style={styles.removeChipButton}
                        onPress={() => removeEquipment(index)}
                      >
                        <Icon name="close-circle" size={16} color="#e53935" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View style={styles.addItemContainer}>
                  <TextInput
                    style={styles.addItemInput}
                    value={newEquipment}
                    onChangeText={setNewEquipment}
                    placeholder="Add equipment"
                  />
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={addEquipment}
                  >
                    <Icon name="plus" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Images */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Images</Text>
                
                {/* Current Images */}
                <View style={styles.imagesContainer}>
                  {images.map((image, index) => (
                    <View key={index} style={styles.imageContainer}>
                      <Image source={{ uri: image }} style={styles.image} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Icon name="trash-can" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                
                {/* Add Image Button */}
                {uploading ? (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="small" color="#366732" />
                    <Text style={styles.uploadingText}>Uploading: {Math.round(uploadProgress)}%</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.addImageButton}
                    onPress={pickImage}
                  >
                    <Icon name="image-plus" size={24} color="#fff" />
                    <Text style={styles.addImageText}>Add Image</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>

              {/* For spacing at bottom of scroll view */}
              <View style={{ height: 30 }} />
            </ScrollView>
          )}
        </Formik>

        {/* Icon Selector Modal */}
        {iconSelectorVisible && (
          <IconSelector
            visible={iconSelectorVisible}
            onClose={() => setIconSelectorVisible(false)}
            onSelectIcon={handleIconSelect}
            selectedIcon={selectedIcon}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    padding: 16,
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
  iconSelector: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconButton: {
    backgroundColor: '#e9f5e8',
    padding: 15,
    borderRadius: 50,
    marginVertical: 10,
  },
  iconName: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#e53935',
    fontSize: 14,
    marginTop: 5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#366732',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#366732',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  rulesContainer: {
    marginBottom: 15,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f9f4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  ruleText: {
    fontSize: 15,
    color: '#555',
    flex: 1,
  },
  removeButton: {
    padding: 5,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addItemInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#366732',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  equipmentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  equipmentChip: {
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
    marginRight: 5,
  },
  removeChipButton: {
    padding: 2,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 10,
    margin: 5,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(229, 57, 53, 0.8)',
    padding: 5,
    borderRadius: 15,
  },
  addImageButton: {
    backgroundColor: '#366732',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  uploadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  saveButton: {
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
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export { EditBookingCategoryScreen };