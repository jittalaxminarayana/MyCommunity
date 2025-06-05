import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useSelector } from 'react-redux';
import * as ImagePicker from 'react-native-image-picker';
import * as Yup from 'yup';

const VendorSchema = Yup.object().shape({
  name: Yup.string().required('Vendor name is required'),
  phone: Yup.string()
    .required('Phone number is required')
    .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits'),
  address: Yup.string().required('Address is required'),
  feeStructure: Yup.string().required('Fee structure is required'),
});

const EditVendorScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { vendor: initialVendor, serviceId } = route.params;
  const communityData = useSelector((state) => state.user.communityData);
  
  const [vendor, setVendor] = useState(initialVendor);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setVendor(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAvailabilityChange = (field, value) => {
    setVendor(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [field]: field === 'workingDays' ? value.split(',').map(s => s.trim()) : value
      }
    }));
  };

  const validateForm = async () => {
    try {
      await VendorSchema.validate({
        name: vendor.name,
        phone: vendor.phone,
        address: vendor.address,
        feeStructure: vendor.feeStructure,
      }, { abortEarly: false });
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
      const cleanName = communityData?.name.replace(/\s+/g, '-').toLowerCase();
      const storageRef = storage().ref( `communities/${communityData.id}-${cleanName}/vendors/${vendor.vendorId}/${filename}`);
      
      const task = storageRef.putFile(imageUri);
      
      task.on('state_changed', snapshot => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      });

      await task;
      const downloadUrl = await storageRef.getDownloadURL();
      
      setVendor(prev => ({
        ...prev,
        images: [...(prev.images || []), downloadUrl]
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = (index) => {
    const updatedImages = [...vendor.images];
    updatedImages.splice(index, 1);
    setVendor(prev => ({ ...prev, images: updatedImages }));
  };

  const handleSave = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    try {
      setLoading(true);
      
      // Find the vendor in the array and update it
      const docRef = firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('homeStoreCategories')
        .doc(serviceId);

      const doc = await docRef.get();
      const currentData = doc.data();
      
      const updatedVendors = currentData.vendors.map(v => 
        v.vendorId === vendor.vendorId ? vendor : v
      );

      await docRef.update({
        vendors: updatedVendors,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success', 'Vendor updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error updating vendor:', error);
      Alert.alert('Error', 'Failed to update vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Vendor</Text>
      </View>

      <View style={styles.formContainer}>
        {/* Images Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Images</Text>
          <View style={styles.imagesContainer}>
            {vendor.images?.map((image, index) => (
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

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Vendor Name*</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={vendor.name}
              onChangeText={(text) => handleChange('name', text)}
              placeholder="Vendor name"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number*</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              value={vendor.phone}
              onChangeText={(text) => handleChange('phone', text)}
              placeholder="Phone number"
              keyboardType="phone-pad"
              maxLength={10}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address*</Text>
            <TextInput
              style={[styles.input, errors.address && styles.inputError]}
              value={vendor.address}
              onChangeText={(text) => handleChange('address', text)}
              placeholder="Address"
              multiline
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={vendor.services?.join(', ')}
            onChangeText={(text) => handleChange('services', text.split(',').map(s => s.trim()))}
            placeholder="e.g. Repair, Installation, Maintenance"
            multiline
          />
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Working Days (comma separated)</Text>
            <TextInput
              style={styles.input}
              value={vendor.availability?.workingDays?.join(', ')}
              onChangeText={(text) => handleAvailabilityChange('workingDays', text)}
              placeholder="e.g. Monday, Tuesday, Wednesday"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Working Hours</Text>
            <TextInput
              style={styles.input}
              value={vendor.availability?.hours}
              onChangeText={(text) => handleAvailabilityChange('hours', text)}
              placeholder="e.g. 09:00 - 18:00"
            />
          </View>
        </View>

        {/* Fee Structure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fee Structure*</Text>
          <TextInput
            style={[styles.input, errors.feeStructure && styles.inputError]}
            value={vendor.feeStructure}
            onChangeText={(text) => handleChange('feeStructure', text)}
            placeholder="e.g. ₹500 per hour or Call for quote"
            multiline
          />
          {errors.feeStructure && <Text style={styles.errorText}>{errors.feeStructure}</Text>}
        </View>

        {/* Verification */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => handleChange('isVerified', !vendor.isVerified)}
          >
            <View style={[
              styles.checkbox,
              vendor.isVerified && styles.checkboxChecked
            ]}>
              {vendor.isVerified && <Icon name="check" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>Verified Vendor</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  contentContainer: {
    paddingBottom: 30,
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
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginLeft: -24,
  },
  backButton: {
    padding: 5,
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
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputError: {
    borderColor: '#e53935',
  },
  errorText: {
    color: '#e53935',
    fontSize: 14,
    marginTop: 5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#366732',
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
  saveButton: {
    backgroundColor: '#366732',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditVendorScreen;