// AddBookingCategoryScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Platform,
  Switch,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Alert,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import * as ImagePicker from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';

const { height: screenHeight } = Dimensions.get('window');

const AddBookingCategoryScreen = () => {
  const navigation = useNavigation();
  const communityData = useSelector((state) => state.user.communityData);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('calendar-blank');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [fee, setFee] = useState('');
  const [rules, setRules] = useState(['']);
  const [equipment, setEquipment] = useState(['']);
  const [images, setImages] = useState([]);
  const [minBookingDuration, setMinBookingDuration] = useState('30');
  const [maxBookingDuration, setMaxBookingDuration] = useState('120');
  const [advanceBookingLimit, setAdvanceBookingLimit] = useState('7');
  const [requiresStaffApproval, setRequiresStaffApproval] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Keyboard height tracking
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleSave = async () => {
    if (!name.trim() || !capacity.trim()) {
      Alert.alert('Error', 'Please fill required fields');
      return;
    }

    setSaving(true);
    
    try {
      // Filter out empty rules and equipment
      const filteredRules = rules.filter(rule => rule.trim() !== '');
      const filteredEquipment = equipment.filter(item => item.trim() !== '');
      
      // Upload images and get URLs
      let imageUrls = [];
      if (images.length > 0) {
        setUploadingImages(true);
        imageUrls = await Promise.all(
          images.map(async (image) => {
            const cleanName = communityData?.name.replace(/\s+/g, '-').toLowerCase();
            const reference = storage().ref(
              `communities/${communityData?.id}-${cleanName}/bookings/${Date.now()}`
            );
            await reference.putFile(image.uri);
            return await reference.getDownloadURL();
          })
        );
        setUploadingImages(false);
      }

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
          rules: filteredRules,
          equipment: filteredEquipment,
          images: imageUrls,
          minBookingDuration: parseInt(minBookingDuration),
          maxBookingDuration: parseInt(maxBookingDuration),
          advanceBookingLimit: parseInt(advanceBookingLimit),
          requiresStaffApproval,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      navigation.goBack();
    } catch (error) {
      console.error('Error adding booking category:', error);
      Alert.alert('Error', 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  const icons = [
    'dumbbell', 'badminton', 'pool', 'tennis',
    'stadium', 'home-group', 'calendar-blank', 'basketball',
    'weight-lifter', 'table-tennis', 'soccer', 'yoga'
  ];

  const addRule = () => {
    setRules([...rules, '']);
  };

  const updateRule = (text, index) => {
    const updatedRules = [...rules];
    updatedRules[index] = text;
    setRules(updatedRules);
  };

  const removeRule = (index) => {
    const updatedRules = [...rules];
    updatedRules.splice(index, 1);
    setRules(updatedRules);
  };

  const addEquipment = () => {
    setEquipment([...equipment, '']);
  };

  const updateEquipment = (text, index) => {
    const updatedEquipment = [...equipment];
    updatedEquipment[index] = text;
    setEquipment(updatedEquipment);
  };

  const removeEquipment = (index) => {
    const updatedEquipment = [...equipment];
    updatedEquipment.splice(index, 1);
    setEquipment(updatedEquipment);
  };

  const pickImage = () => {
    // Dismiss keyboard before opening image picker
    Keyboard.dismiss();
    
    ImagePicker.launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 3 - images.length,
    }, (response) => {
      if (response.didCancel) {
        return;
      }
      
      if (response.errorCode) {
        Alert.alert('Error', 'ImagePicker Error: ' + response.errorMessage);
        return;
      }
      
      if (response.assets) {
        setImages([...images, ...response.assets]);
      }
    });
  };

  const removeImage = (index) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
  };

  return (
    <View style={styles.mainContainer}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Booking Category</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={dismissKeyboard}
            style={styles.touchableContainer}
          >
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Basic Information</Text>
              
              {/* Facility Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Facility Name*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Gym, Badminton Court"
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                />
              </View>

              {/* Icon Selection */}
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

              {/* Description */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Brief description of the facility"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={description}
                  onChangeText={setDescription}
                  returnKeyType="next"
                />
              </View>

              {/* Capacity */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Capacity*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 20"
                  keyboardType="numeric"
                  value={capacity}
                  onChangeText={setCapacity}
                  returnKeyType="next"
                />
              </View>

              {/* Opening Hours */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Opening Hours</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 06:00 - 22:00"
                  value={openingHours}
                  onChangeText={setOpeningHours}
                  returnKeyType="next"
                />
              </View>

              {/* Fee Structure */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Fee Structure</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Free for residents or $10/hour"
                  value={fee}
                  onChangeText={setFee}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Rules Section */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rules</Text>
              {rules.map((rule, index) => (
                <View key={index} style={styles.listItemContainer}>
                  <TextInput
                    style={styles.listItemInput}
                    placeholder="Add a rule"
                    value={rule}
                    onChangeText={(text) => updateRule(text, index)}
                    returnKeyType="next"
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeRule(index)}
                  >
                    <Icon name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={addRule}>
                <Icon name="plus" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Rule</Text>
              </TouchableOpacity>
            </View>

            {/* Equipment Section */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Equipment</Text>
              {equipment.map((item, index) => (
                <View key={index} style={styles.listItemContainer}>
                  <TextInput
                    style={styles.listItemInput}
                    placeholder="Add equipment"
                    value={item}
                    onChangeText={(text) => updateEquipment(text, index)}
                    returnKeyType="next"
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeEquipment(index)}
                  >
                    <Icon name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={addEquipment}>
                <Icon name="plus" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Equipment</Text>
              </TouchableOpacity>
            </View>

            {/* Images Section */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Facility Images</Text>
              <View style={styles.imagesContainer}>
                {images.map((image, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: image.uri }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Icon name="close-circle" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 3 && (
                  <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                    <Icon name="camera-plus" size={30} color="#366732" />
                    <Text style={styles.imagePickerText}>Add Image</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Booking Configuration */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Booking Configuration</Text>
              
              <View style={styles.inputRow}>
                <Text style={styles.configLabel}>Min Duration (minutes)</Text>
                <TextInput
                  style={styles.configInput}
                  keyboardType="numeric"
                  value={minBookingDuration}
                  onChangeText={setMinBookingDuration}
                  returnKeyType="next"
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.configLabel}>Max Duration (minutes)</Text>
                <TextInput
                  style={styles.configInput}
                  keyboardType="numeric"
                  value={maxBookingDuration}
                  onChangeText={setMaxBookingDuration}
                  returnKeyType="next"
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.configLabel}>Advance Booking Days</Text>
                <TextInput
                  style={styles.configInput}
                  keyboardType="numeric"
                  value={advanceBookingLimit}
                  onChangeText={setAdvanceBookingLimit}
                  returnKeyType="done"
                />
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.configLabel}>Requires Staff Approval</Text>
                <Switch
                  trackColor={{ false: "#dddddd", true: "#81b075" }}
                  thumbColor={requiresStaffApproval ? "#366732" : "#f4f3f4"}
                  ios_backgroundColor="#dddddd"
                  onValueChange={setRequiresStaffApproval}
                  value={requiresStaffApproval}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSave}
              disabled={saving || uploadingImages}
            >
              {saving || uploadingImages ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.loadingText}>
                    {uploadingImages ? 'Uploading images...' : 'Saving...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.saveButtonText}>Save Facility</Text>
              )}
            </TouchableOpacity>

            {/* Extra space for keyboard */}
            <View style={{ height: keyboardHeight > 0 ? 50 : 30 }} />
          </TouchableOpacity>
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
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  scrollContainer: {
    padding: 14,
    paddingBottom: 10,
  },
  touchableContainer: {
    flex: 1,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedIcon: {
    borderWidth: 2,
    borderColor: '#366732',
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  listItemInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  removeButton: {
    padding: 5,
    marginLeft: 10,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#366732',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(229, 57, 53, 0.8)',
    padding: 5,
    borderRadius: 15,
  },
  imagePickerButton: {
    width: 100,
    height: 100,
    margin: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  imagePickerText: {
    marginTop: 5,
    color: '#366732',
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configLabel: {
    fontSize: 16,
    color: '#555',
    flex: 1,
  },
  configInput: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 6,
    width: 100,
    textAlign: 'center',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#366732',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  }
});

export { AddBookingCategoryScreen };