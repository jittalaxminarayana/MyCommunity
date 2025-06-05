import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  KeyboardAvoidingView
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useSelector } from 'react-redux';
import * as ImagePicker from 'react-native-image-picker';
import * as Yup from 'yup';

// Validation schema
const VendorSchema = Yup.object().shape({
  name: Yup.string().required('Vendor name is required'),
  phone: Yup.string()
    .required('Phone number is required')
    .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits'),
  address: Yup.string().required('Address is required'),
  services: Yup.string().required('Services are required'),
  workingDays: Yup.string().required('Working days are required'),
  hours: Yup.string().required('Working hours are required'),
  feeStructure: Yup.string().required('Fee structure is required'),
});

const AddVendorScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { serviceId } = route.params;
  const communityData = useSelector((state) => state.user.communityData);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [images, setImages] = useState([]);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    services: '',
    workingDays: '',
    hours: '',
    feeStructure: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const pickImage = async () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    };

    ImagePicker.launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', 'Failed to pick image');
      } else if (response.assets && response.assets.length > 0) {
        uploadImage(response.assets[0]);
      }
    });
  };

  const uploadImage = async (image) => {
    try {
      setUploading(true);
      const imageUri = Platform.OS === 'ios' ? image.uri.replace('file://', '') : image.uri;
      const filename = imageUri.substring(imageUri.lastIndexOf('/') + 1);
      const tempVendorId = `temp_${Date.now()}`;
      const cleanName = communityData?.name.replace(/\s+/g, '-').toLowerCase();
      const storageRef = storage().ref( `communities/${communityData?.id}-${cleanName}/vendors/${tempVendorId}/${filename}`);

      const task = storageRef.putFile(imageUri);

      task.on('state_changed', snapshot => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      });

      await task;
      const downloadUrl = await storageRef.getDownloadURL();

      setImages(prev => [...prev, downloadUrl]);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = (index) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
  };

  const validateForm = async () => {
    try {
      await VendorSchema.validate(form, { abortEarly: false });
      return true;
    } catch (err) {
      const formattedErrors = {};
      err.inner.forEach(e => {
        formattedErrors[e.path] = e.message;
      });
      setErrors(formattedErrors);
      return false;
    }
  };

  const handleAddVendor = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    try {
      setLoading(true);
      const newVendor = {
        vendorId: form.phone,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        rating: 0, // Default rating
        services: form.services.split(',').map(s => s.trim()), // Convert to array
        availability: {
          workingDays: form.workingDays.split(',').map(s => s.trim()), // Convert to array
          hours: form.hours.trim()
        },
        feeStructure: form.feeStructure.trim(),
        isVerified: false,
        images: images, // Include uploaded images
      };

      await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('homeStoreCategories')
        .doc(serviceId)
        .update({
          vendors: firestore.FieldValue.arrayUnion(newVendor),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      Alert.alert('Success', 'Vendor added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error adding vendor:', error);
      Alert.alert('Error', error.message || 'Failed to add vendor');
    } finally {
      setLoading(false);
    }
  };

  const inputFields = [
    { name: 'name', label: 'Vendor Name*', placeholder: 'e.g. Quick Fix' },
    {
      name: 'phone',
      label: 'Phone Number*',
      placeholder: 'e.g. 9876543210',
      keyboardType: 'phone-pad',
      maxLength: 10
    },
    { name: 'address', label: 'Address*', placeholder: 'e.g. 456 Main St, City' },
    {
      name: 'services',
      label: 'Services* (comma separated)',
      placeholder: 'e.g. Repair, Installation, Maintenance'
    },
    {
      name: 'workingDays',
      label: 'Working Days* (comma separated)',
      placeholder: 'e.g. Monday, Wednesday, Friday'
    },
    {
      name: 'hours',
      label: 'Working Hours*',
      placeholder: 'e.g. 09:00 - 18:00'
    },
    {
      name: 'feeStructure',
      label: 'Fee Structure*',
      placeholder: 'e.g. ₹500 per hour or Call for quote'
    }
  ];

  return (
    <View style={styles.mainContainer}>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backIconButton}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Vendor</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            {/* Images Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Images</Text>
              <View style={styles.imagesContainer}>
                {images.map((image, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: image }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Icon name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
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
                  <Icon name="image-plus" size={20} color="#fff" />
                  <Text style={styles.addImageText}>Add Image</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Form Fields */}
            {inputFields.map(input => (
              <View key={input.name} style={styles.inputContainer}>
                <Text style={styles.label}>{input.label}</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors[input.name] && styles.inputError,
                    (input.name === 'address' || input.name === 'feeStructure') && styles.multilineInput
                  ]}
                  value={form[input.name]}
                  onChangeText={(value) => handleChange(input.name, value)}
                  placeholder={input.placeholder}
                  keyboardType={input.keyboardType || 'default'}
                  maxLength={input.maxLength}
                  multiline={input.name === 'address' || input.name === 'feeStructure'}
                  numberOfLines={input.name === 'address' || input.name === 'feeStructure' ? 3 : 1}
                  textAlignVertical={input.name === 'address' || input.name === 'feeStructure' ? 'top' : 'center'}
                />
                {errors[input.name] && (
                  <Text style={styles.errorText}>{errors[input.name]}</Text>
                )}
              </View>
            ))}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled
              ]}
              onPress={handleAddVendor}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add Vendor</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({

  mainContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    backgroundColor: '#366732',
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    marginRight: 35
  },
  backIconButton: {
    padding: 8,
  },
  formContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#366732',
    marginBottom: 15,
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
    borderRadius: 15,
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  uploadingText: {
    marginLeft: 10,
    color: '#666',
  },
  addImageButton: {
    backgroundColor: '#366732',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 5,
  },
  addImageText: {
    color: '#fff',
    marginLeft: 10,
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
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: 15,
  },
  inputError: {
    borderColor: '#e53935',
  },
  errorText: {
    color: '#e53935',
    fontSize: 14,
    marginTop: 5,
    marginLeft: 5,
  },
  submitButton: {
    backgroundColor: '#366732',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export { AddVendorScreen };