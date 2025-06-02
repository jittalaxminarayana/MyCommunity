// AddBookingCategoryScreen.js
import React, { useState } from 'react';
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
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import * as ImagePicker from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';

const AddBookingCategoryScreen = () => {
  const navigation = useNavigation();
  const communityData = useSelector((state) => state.user.communityData);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('calendar-blank');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [fee, setFee] = useState('');
  
  // New state variables
  const [rules, setRules] = useState(['']);
  const [equipment, setEquipment] = useState(['']);
  const [images, setImages] = useState([]);
  const [minBookingDuration, setMinBookingDuration] = useState('30');
  const [maxBookingDuration, setMaxBookingDuration] = useState('120');
  const [advanceBookingLimit, setAdvanceBookingLimit] = useState('7');
  const [requiresStaffApproval, setRequiresStaffApproval] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !capacity.trim()) {
      alert('Please fill required fields');
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
            const reference = storage().ref(`communities/${communityData.id}/bookings/${Date.now()}`);
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
      alert('Failed to add category');
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
    ImagePicker.launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 3 - images.length,
    }, (response) => {
      if (response.didCancel) {
        return;
      }
      
      if (response.errorCode) {
        alert('ImagePicker Error: ' + response.errorMessage);
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
    <View style={{flex:1}}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Category</Text>
      </View>

      <ScrollView style={styles.container}>
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

        {/* Rules Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Rules</Text>
          {rules.map((rule, index) => (
            <View key={index} style={styles.listItemContainer}>
              <TextInput
                style={styles.listItemInput}
                placeholder="Add a rule"
                value={rule}
                onChangeText={(text) => updateRule(text, index)}
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
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Equipment</Text>
          {equipment.map((item, index) => (
            <View key={index} style={styles.listItemContainer}>
              <TextInput
                style={styles.listItemInput}
                placeholder="Add equipment"
                value={item}
                onChangeText={(text) => updateEquipment(text, index)}
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
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Facility Images</Text>
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
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Booking Configuration</Text>
          
          <View style={styles.inputRow}>
            <Text style={styles.configLabel}>Min Duration (minutes)</Text>
            <TextInput
              style={styles.configInput}
              keyboardType="numeric"
              value={minBookingDuration}
              onChangeText={setMinBookingDuration}
            />
          </View>
          
          <View style={styles.inputRow}>
            <Text style={styles.configLabel}>Max Duration (minutes)</Text>
            <TextInput
              style={styles.configInput}
              keyboardType="numeric"
              value={maxBookingDuration}
              onChangeText={setMaxBookingDuration}
            />
          </View>
          
          <View style={styles.inputRow}>
            <Text style={styles.configLabel}>Advance Booking Days</Text>
            <TextInput
              style={styles.configInput}
              keyboardType="numeric"
              value={advanceBookingLimit}
              onChangeText={setAdvanceBookingLimit}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  saveButton: {
    backgroundColor: '#366732',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#366732',
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  listItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  removeButton: {
    padding: 8,
    marginLeft: 10,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#366732',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageContainer: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
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
    color: '#333',
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