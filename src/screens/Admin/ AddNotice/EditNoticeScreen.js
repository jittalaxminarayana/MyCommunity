import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator, Image, PermissionsAndroid } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const EditNoticeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { noticeId } = route.params;
  const { communityData } = useSelector((state) => state.user);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('announcement');
  const [expireDate, setExpireDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const noticeDoc = await firestore()
          .collection('communities')
          .doc(communityData.id)
          .collection('notices')
          .doc(noticeId)
          .get();

        if (noticeDoc.exists) {
          const noticeData = noticeDoc.data();
          setTitle(noticeData.title);
          setContent(noticeData.content);
          setCategory(noticeData.category);
          setExpireDate(noticeData.expireAt.toDate());
          setAttachments(noticeData.attachments || []);
        }
      } catch (error) {
        console.error('Error fetching notice: ', error);
        Alert.alert('Error', 'Failed to load notice details');
      } finally {
        setLoading(false);
      }
    };

    fetchNotice();
  }, [noticeId, communityData.id]);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs camera permission to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const showImagePicker = () => {
    Alert.alert(
      'Select Image',
      'Choose from where you want to select an image',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos');
      return;
    }

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
    };

    launchCamera(options, handleImageResponse);
  };

  const openGallery = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
    };

    launchImageLibrary(options, handleImageResponse);
  };

  const handleImageResponse = (response) => {
    if (response.didCancel || response.error) {
      return;
    }

    if (response.assets && response.assets[0]) {
      uploadImage(response.assets[0]);
    }
  };

  const uploadImage = async (imageAsset) => {
    setUploading(true);
    try {
      const cleanName = communityData?.name.replace(/\s+/g, '-').toLowerCase();
      const fileName = `${Date.now()}_${imageAsset.fileName || 'image.jpg'}`;
      const reference = storage().ref(
        `communities/${communityData?.id}-${cleanName}/notices/${fileName}`
      );

      await reference.putFile(imageAsset.uri);
      const downloadURL = await reference.getDownloadURL();
      
      setAttachments(prev => [...prev, downloadURL]);
      Alert.alert('Success', 'Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setAttachments(prev => prev.filter((_, i) => i !== index));
          }
        }
      ]
    );
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpireDate(selectedDate);
    }
  };

  const handleUpdate = async () => {
    if (!title || !content) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('notices')
        .doc(noticeId)
        .update({
          title,
          content,
          category,
          expireAt: expireDate,
          attachments,
        });

      Alert.alert('Success', 'Notice updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating notice: ', error);
      Alert.alert('Error', 'Failed to update notice');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this notice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // First delete all attached images from storage
              if (attachments.length > 0) {
                const cleanName = communityData?.name.replace(/\s+/g, '-').toLowerCase();
                const basePath = `communities/${communityData?.id}-${cleanName}/notices/`;
                
                await Promise.all(
                  attachments.map(async (url) => {
                    try {
                      // Extract the file name from the URL
                      const fileName = url.split('%2F').pop().split('?')[0];
                      const fileRef = storage().ref(`${basePath}${fileName}`);
                      await fileRef.delete();
                    } catch (error) {
                      console.error('Error deleting image:', error);
                      // Continue even if one image fails to delete
                    }
                  })
                );
              }
  
              // Then delete the notice document
              await firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('notices')
                .doc(noticeId)
                .delete();
  
              Alert.alert('Success', 'Notice deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting notice: ', error);
              Alert.alert('Error', 'Failed to delete notice');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Notice</Text>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#366732" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Notice</Text>
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

        <Text style={styles.label}>Images</Text>
        <TouchableOpacity 
          style={styles.addImageButton} 
          onPress={showImagePicker}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#366732" />
          ) : (
            <>
              <Icon name="camera-plus" size={24} color="#366732" />
              <Text style={styles.addImageText}>Add Image</Text>
            </>
          )}
        </TouchableOpacity>

        {attachments.length > 0 && (
          <View style={styles.imagesContainer}>
            {attachments.map((imageUrl, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: imageUrl }} style={styles.attachedImage} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Icon name="close-circle" size={20} color="#f44336" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleUpdate}>
          <Text style={styles.submitButtonText}>Update Notice</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>Delete Notice</Text>
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  addImageButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#366732',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    flexDirection: 'row',
  },
  addImageText: {
    color: '#366732',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  attachedImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  submitButton: {
    backgroundColor: '#366732',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EditNoticeScreen;