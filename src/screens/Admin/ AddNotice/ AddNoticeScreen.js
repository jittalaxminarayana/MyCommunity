import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, Image, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { functions } from '../../../services/firebase';
import { httpsCallable } from 'firebase/functions';

const AddNoticeScreen = () => {
  const navigation = useNavigation();
  const { communityData, userData } = useSelector((state) => state.user);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('announcement');
  const [expireDate, setExpireDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const selectImage = () => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    };

    launchCamera(options, (response) => {
      if (response.assets && response.assets[0]) {
        addImageToList(response.assets[0]);
      }
    });
  };

  const openGallery = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
      selectionLimit: 5, // Allow multiple selection
    };

    launchImageLibrary(options, (response) => {
      if (response.assets) {
        response.assets.forEach(asset => {
          addImageToList(asset);
        });
      }
    });
  };

  const addImageToList = (imageAsset) => {
    if (selectedImages.length >= 5) {
      Alert.alert('Limit Reached', 'You can only add up to 5 images per notice');
      return;
    }

    const newImage = {
      id: Date.now() + Math.random(),
      uri: imageAsset.uri,
      fileName: imageAsset.fileName,
      type: imageAsset.type,
      asset: imageAsset
    };

    setSelectedImages(prev => [...prev, newImage]);
  };

  const removeImage = (imageId) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const uploadImages = async () => {
    if (selectedImages.length === 0) return [];

    const uploadPromises = selectedImages.map(async (imageData) => {
      const cleanName = communityData?.name.replace(/\s+/g, '-').toLowerCase();
      const fileName = `${Date.now()}_${imageData.fileName || 'image.jpg'}`;
      const reference = storage().ref(
        `communities/${communityData?.id}-${cleanName}/notices/${fileName}`
      );

      await reference.putFile(imageData.uri);
      return await reference.getDownloadURL();
    });

    return await Promise.all(uploadPromises);
  };

  const handleSubmit = async () => {
    if (!title || !content) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setUploading(true);

    try {
      // Upload images first
      const imageUrls = await uploadImages();

      // Create the notice document
      await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('notices')
        .add({
          title,
          content,
          category,
          createdBy: userData.id,
          createdAt: firestore.FieldValue.serverTimestamp(),
          expireAt: expireDate,
          attachments: imageUrls
        });

        // Send notification with the passId
      await sendNotificationToAllUsers(communityData?.id);

      Alert.alert('Success', 'Notice posted successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding notice: ', error);
      Alert.alert('Error', 'Failed to post notice. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const sendNotificationToAllUsers = async ( communityId) => {
    try {
      const sendToAllUserDevices = httpsCallable(functions(), 'sendToAllCommunityUsers');
  
      const result = await sendToAllUserDevices({
        communityId: communityId,
        title: "New Notice Posted",
        body: "A new notice has been posted on the community notice board. Check it out!",
        extraData: {
          screen: 'Home',
          type: "announcement",
          priority: "high",
        },
      });
  
      console.log('Notification Sent:', result.data);
    } catch (error) {
      console.error('Notification Error:', error);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpireDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post New Notice</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <Text style={styles.label}>Title*</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter notice title"
        />

        <Text style={styles.label}>Content*</Text>
        <TextInput
          style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
          value={content}
          onChangeText={setContent}
          placeholder="Enter notice content"
          multiline
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryContainer}>
          {['announcement', 'event', 'emergency'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                category === cat && styles.selectedCategory
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[
                styles.categoryText,
                category === cat && styles.selectedCategoryText
              ]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Images (Optional)</Text>
        <TouchableOpacity style={styles.imageSelectButton} onPress={selectImage}>
          <Icon name="camera-plus" size={24} color="#366732" />
          <Text style={styles.imageSelectText}>Add Images ({selectedImages.length}/5)</Text>
        </TouchableOpacity>

        {selectedImages.length > 0 && (
          <View style={styles.imagePreviewContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedImages.map((image) => (
                <View key={image.id} style={styles.imagePreview}>
                  <Image source={{ uri: image.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(image.id)}
                  >
                    <Icon name="close-circle" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.label}>Expiry Date</Text>
        <TouchableOpacity 
          style={styles.dateInput} 
          onPress={() => setShowDatePicker(true)}
        >
          <Text>{expireDate.toLocaleDateString()}</Text>
          <Icon name="calendar" size={20} color="#366732" />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={expireDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        <TouchableOpacity 
          style={[styles.submitButton, uploading && styles.disabledButton]} 
          onPress={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.submitButtonText}>Posting...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Post Notice</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
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
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryButton: {
    flex: 1,
    marginHorizontal: 5,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedCategory: {
    backgroundColor: '#366732',
  },
  categoryText: {
    color: '#333',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  imageSelectButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageSelectText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#366732',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    marginBottom: 20,
  },
  imagePreview: {
    position: 'relative',
    marginRight: 10,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  dateInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#366732',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AddNoticeScreen;