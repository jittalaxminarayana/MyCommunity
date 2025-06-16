import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Switch,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import { firebase } from '@react-native-firebase/firestore';
import { updateUserProfileUrl, logout } from '../../../store/Slices/userSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

const ProfileScreen = () => {
  const userData = useSelector((state) => state?.user?.userData);
  const communityData = useSelector((state) => state?.user?.communityData);
  const dispatch = useDispatch();
  
  // State for expandable sections
  const [expandedSection, setExpandedSection] = useState(null);
  
  // State for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // User data states
  const [userId, setUserId] = useState(userData?.id || '');
  const [name, setName] = useState(userData?.name || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [phone, setPhone] = useState(userData?.phoneNumber ? userData.phoneNumber.toString() : '');
  const [profileImage, setProfileImage] = useState(userData?.profileImageUrl || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Family members state
  const [familyMembers, setFamilyMembers] = useState(userData?.familyMembers || []);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  
  // Staff members state
  const [staffMembers, setStaffMembers] = useState(userData?.staffMembers || []);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  
  // Vehicles state
  const [vehicles, setVehicles] = useState(userData?.vehicles || []);
  const [newVehicleType, setNewVehicleType] = useState('');
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newParkingSlot, setNewParkingSlot] = useState('');

  const [isModalVisible, setModalVisible] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    shareContactInfo: userData?.privacySettings?.shareContactInfo || false,
    receiveNotifications: userData?.privacySettings?.receiveNotifications || true,
    showProfileInDirectory: userData?.privacySettings?.showProfileInDirectory || true
  });

  const [selectedMemberImage, setSelectedMemberImage] = useState(null);
  const [selectedStaffImage, setSelectedStaffImage] = useState(null);
  const [selectedVehicleImage, setSelectedVehicleImage] = useState(null);

  useEffect(() => {
    // Update local state when userData changes
    if (userData) {
      setName(userData.name || '');
      setEmail(userData.email || '');
      setPhone(userData.phoneNumber ? userData.phoneNumber.toString() : '');
      setProfileImage(userData.profileImageUrl || '');
      setFamilyMembers(userData.familyMembers || []);
      setStaffMembers(userData.staffMembers || []);
      setVehicles(userData.vehicles || []);
      setPrivacySettings(userData.privacySettings || {
        shareContactInfo: false,
        receiveNotifications: true,
        showProfileInDirectory: true
      });
    }
  }, [userData]);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSubmit = async () => {
    if (!email || !feedback) return;
  
    try {
      setSubmitting(true);
      await firestore()
        .collection('communities')
        .doc(communityData?.id)
        .collection('feedback')
        .add({
          email,
          feedback,
          createdAt: new Date().toISOString(),
          userId,
          name,
        });
  
      setModalVisible(false);
      setEmail('');
      setFeedback('');
  
      Alert.alert(
        'Thank You!',
        'Your feedback has been received successfully.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Error sending feedback:', err);
      Alert.alert('Error', 'Something went wrong while sending your feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const uploadImage = async (path, imageUri) => {
    const imageRef = storage().ref(path);
    await imageRef.putFile(imageUri);
    return await imageRef.getDownloadURL();
  };
  
  const uploadFamilyMemberImage = async (memberId, memberName, imageUri) => {
    const cleanName = communityData?.name.replace(/\s+/g, '-').toLowerCase();
    const userCleanName = userData?.name.replace(/\s+/g, '-').toLowerCase();
    const memberCleanName = memberName.replace(/\s+/g, '-').toLowerCase();
    
    const path = `communities/${communityData?.id}-${cleanName}/users/${userData.id}-${userCleanName}/family/${memberId}-${memberCleanName}/${Date.now()}-family`;
    return await uploadImage(path, imageUri);
  };
  
  const uploadStaffMemberImage = async (staffId, staffName, imageUri) => {
    const cleanName = communityData?.name.replace(/\s+/g, '-').toLowerCase();
    const userCleanName = userData?.name.replace(/\s+/g, '-').toLowerCase();
    const staffCleanName = staffName.replace(/\s+/g, '-').toLowerCase();
    
    const path = `communities/${communityData?.id}-${cleanName}/users/${userData.id}-${userCleanName}/staff/${staffId}-${staffCleanName}/${Date.now()}-staff`;
    return await uploadImage(path, imageUri);
  };
  
  const uploadVehicleImage = async (vehicleId, vehicleNumber, imageUri) => {
    const cleanName = communityData?.name.replace(/\s+/g, '-').toLowerCase();
    const userCleanName = userData?.name.replace(/\s+/g, '-').toLowerCase();
    const cleanVehicleNumber = vehicleNumber.replace(/\s+/g, '-').toLowerCase();
    
    const path = `communities/${communityData?.id}-${cleanName}/users/${userData.id}-${userCleanName}/vehicles/${vehicleId}-${cleanVehicleNumber}/${Date.now()}-vehicle`;
    return await uploadImage(path, imageUri);
  };

  const selectImage = (type) => {
    const options = {
      mediaType: 'photo',
      maxWidth: 1000,
      maxHeight: 1000,
      quality: 0.8,
    };
  
    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.errorCode || !response.assets?.[0]?.uri) return;
      
      const image = {
        uri: response.assets[0].uri,
        name: response.assets[0].fileName || `image-${Date.now()}`,
      };
  
      switch(type) {
        case 'family':
          setSelectedMemberImage(image);
          break;
        case 'staff':
          setSelectedStaffImage(image);
          break;
        case 'vehicle':
          setSelectedVehicleImage(image);
          break;
      }
    });
  };

  const handleSelectProfileImage = () => {
    const options = {
      mediaType: 'photo',
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.8,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to select image');
      } else if (response.assets && response.assets.length > 0) {
        setUploadingImage(true);
        try {
          const source = { uri: response.assets[0].uri };
          setProfileImage(source.uri);
          
          // Upload to Firebase storage if in edit mode
          if (isEditMode) {
            const cleanName = communityData?.name.replace(/\s+/g, '-').toLowerCase();
            const userCleanName = userData?.name.replace(/\s+/g, '-').toLowerCase();
            const imageRef = storage().ref(
              `communities/${communityData?.id}-${cleanName}/users/${userData.id}-${userCleanName}/profile/${Date.now()}-profile`
            );
            await imageRef.putFile(source.uri);
            const downloadUrl = await imageRef.getDownloadURL();
            setProfileImage(downloadUrl);
            
            // Update in Firestore
            await firebase.firestore()
              .collection('communities')
              .doc(communityData?.id)
              .collection('users')
              .doc(userData.id)
              .update({
                profileImageUrl: downloadUrl
              });

              dispatch(updateUserProfileUrl(downloadUrl));
            
            Alert.alert('Success', 'Profile image updated successfully');
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Error', 'Failed to upload image');
        } finally {
          setUploadingImage(false);
        }
      }
    });
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    
    setIsSaving(true);
    try {
      const updatedData = {
        name,
        email,
        phoneNumber: phone ? parseInt(phone, 10) : null,
        familyMembers,
        staffMembers,
        vehicles,
        privacySettings
      };
      
      // Update in Firestore
      await firebase.firestore()
        .collection('communities')
        .doc(communityData?.id)
        .collection('users')
        .doc(userData.id)
        .update(updatedData);
      
      // Update Redux state
      dispatch({
        type: 'UPDATE_USER_PROFILE',
        payload: updatedData
      });
      
      setIsEditMode(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const addFamilyMember = async () => {
    if (!newMemberName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
  
    try {
      setIsLoading(true);
      const newMember = {
        id: Date.now().toString(),
        name: newMemberName,
        relation: newMemberRelation,
        phone: newMemberPhone,
        imageUrl: ''
      };

      // Upload image if selected
      if (selectedMemberImage) {
        newMember.imageUrl = await uploadFamilyMemberImage(
          newMember.id,
          newMember.name,
          selectedMemberImage.uri
        );
      }

      const updatedData = {
        name,
        email,
        phoneNumber: phone ? parseInt(phone, 10) : null,
        familyMembers,
        staffMembers,
        vehicles,
        privacySettings
      };
  
      // Reference to the user document in the community
      const userRef = firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('users')
        .doc(userData.id);
  
      // Add the new family member to the familyMembers array
      await userRef.update({
        familyMembers: firestore.FieldValue.arrayUnion(newMember)
      });
  
      // Update local state
      setFamilyMembers([...familyMembers, newMember]);
      setNewMemberName('');
      setNewMemberRelation('');
      setNewMemberPhone('');
      setSelectedMemberImage(null);
      setShowAddMemberModal(false);

      // Update Redux state
      dispatch({
        type: 'UPDATE_USER_PROFILE',
        payload: updatedData
      }); 
      setIsSaving(false);
      Alert.alert('Success', 'Family member added successfully');
      
    } catch (error) {
      setIsSaving(false);
      console.error('Error adding family member:', error);
      Alert.alert('Error', 'Failed to add family member');
    }
  };

  const removeFamilyMember = (id) => {
    Alert.alert(
      'Confirm Removal',
      'Are you sure you want to remove this family member?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const updatedMembers = familyMembers.filter(member => member.id !== id);
            setFamilyMembers(updatedMembers);
          }
        }
      ]
    );
  };

  const addStaffMember = async () => {
    if (!newStaffName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    try {
      setIsLoading(true);
      const newStaff = {
        id: Date.now().toString(),
        name: newStaffName,
        role: newStaffRole,
        phone: newStaffPhone,
        imageUrl: ''
      };

      if (selectedStaffImage) {
        newStaff.imageUrl = await uploadStaffMemberImage(
          newStaff.id,
          newStaff.name,
          selectedStaffImage.uri
        );
      }

      const updatedData = {
        name,
        email,
        phoneNumber: phone ? parseInt(phone, 10) : null,
        familyMembers,
        staffMembers,
        vehicles,
        privacySettings
      };

      // Reference to the user document in the community
      const userRef = firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('users')
        .doc(userData.id);
  
      // Add the new staff member to the familyMembers array
      await userRef.update({
        staffMembers: firestore.FieldValue.arrayUnion(newStaff)
      });
  
      // Update local state
      setStaffMembers([...staffMembers, newStaff]);
      setNewStaffName('');
      setNewStaffRole('');
      setNewStaffPhone('');
      setShowAddStaffModal(false);
      setSelectedStaffImage(null);

      // Update Redux state
      dispatch({
        type: 'UPDATE_USER_PROFILE',
        payload: updatedData
      });  
      setIsLoading(false);
      Alert.alert('Success', 'Family member added successfully');
      
    } catch (error) {
      setIsLoading(false);
      console.error('Error adding family member:', error);
      Alert.alert('Error', 'Failed to add family member');
    }
  };

  const removeStaffMember = (id) => {
    Alert.alert(
      'Confirm Removal',
      'Are you sure you want to remove this staff member?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const updatedStaff = staffMembers.filter(staff => staff.id !== id);
            setStaffMembers(updatedStaff);
          }
        }
      ]
    );
  };

  const addVehicle = async () => {
    if (!newVehicleNumber.trim()) {
      Alert.alert('Error', 'Vehicle number cannot be empty');
      return;
    }
  
    try {
      setIsLoading(true);
      const newVehicle = {
        id: Date.now().toString(),
        type: newVehicleType,
        number: newVehicleNumber,
        model: newVehicleModel,
        parkingSlot: newParkingSlot,
        imageUrl: ''
      };

      if (selectedVehicleImage) {
        newVehicle.imageUrl = await uploadVehicleImage(
          newVehicle.id,
          newVehicle.number,
          selectedVehicleImage.uri
        );
      }

      const updatedData = {
        name,
        email,
        phoneNumber: phone ? parseInt(phone, 10) : null,
        familyMembers,
        staffMembers,
        vehicles,
        privacySettings
      };
  
      // Reference to the user document in the community
      const userRef = firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('users')
        .doc(userData.id);
  
      // Add the new vehicle to the vehicles array
      await userRef.update({
        vehicles: firestore.FieldValue.arrayUnion(newVehicle)
      });
  
      // Update local state
      setVehicles([...vehicles, newVehicle]);
      setNewVehicleType('');
      setNewVehicleNumber('');
      setNewVehicleModel('');
      setShowAddVehicleModal(false);
      setSelectedVehicleImage(null);

      // Update Redux state
      dispatch({
        type: 'UPDATE_USER_PROFILE',
        payload: updatedData
      }); 
      setIsLoading(false); 
      Alert.alert('Success', 'Vehicle added successfully');
      
    } catch (error) {
      setIsLoading(false);
      console.error('Error adding vehicle:', error);
      Alert.alert('Error', 'Failed to add vehicle');
    }
  };

  const removeVehicle = (id) => {
    Alert.alert(
      'Confirm Removal',
      'Are you sure you want to remove this vehicle?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const updatedVehicles = vehicles.filter(vehicle => vehicle.id !== id);
            setVehicles(updatedVehicles);
          }
        }
      ]
    );
  };

  const handlePrivacyToggle = (setting) => {
    setPrivacySettings({
      ...privacySettings,
      [setting]: !privacySettings[setting]
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear data from AsyncStorage
              await AsyncStorage.removeItem('@userDataId');
              await AsyncStorage.removeItem('@communityDataId');
              
              // Dispatch logout action to clear Redux state
              dispatch(logout());
              
              // Now the app will re-render based on the isAuthenticated value in Redux
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout properly');
            }
          }
        }
      ]
    );
  };

  const handleFeedback = () => {
    // Navigate to feedback screen or show feedback modal
    Alert.alert('Feedback', 'Feedback functionality will be implemented soon.');
  };

  // Family Member Modal
  const renderAddMemberModal = () => (
    <Modal
      visible={showAddMemberModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddMemberModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Family Member</Text>

          <TouchableOpacity
            style={styles.imageUploadButton}
            onPress={() => selectImage('family')}
          >
            {selectedMemberImage ? (
              <Image
                source={{ uri: selectedMemberImage.uri }}
                style={styles.previewImage}
              />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Icon name="camera" size={24} color="#366732" />
                <Text>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={newMemberName}
            onChangeText={setNewMemberName}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Relation"
            value={newMemberRelation}
            onChangeText={setNewMemberRelation}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={newMemberPhone}
            onChangeText={setNewMemberPhone}
            keyboardType="phone-pad"
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowAddMemberModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButtonForItem]}
              onPress={addFamilyMember}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Staff Member Modal
  const renderAddStaffModal = () => (
    <Modal
      visible={showAddStaffModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddStaffModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Staff Member</Text>

          <TouchableOpacity
            style={styles.imageUploadButton}
            onPress={() => selectImage('staff')}
          >
            {selectedStaffImage ? (
              <Image
                source={{ uri: selectedStaffImage.uri }}
                style={styles.previewImage}
              />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Icon name="camera" size={24} color="#366732" />
                <Text>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={newStaffName}
            onChangeText={setNewStaffName}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Role (e.g., Maid, Driver)"
            value={newStaffRole}
            onChangeText={setNewStaffRole}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={newStaffPhone}
            onChangeText={setNewStaffPhone}
            keyboardType="phone-pad"
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowAddStaffModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButtonForItem]}
              onPress={addStaffMember}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Vehicle Modal
  const renderAddVehicleModal = () => (
    <Modal
      visible={showAddVehicleModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddVehicleModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Vehicle</Text>

          <TouchableOpacity
            style={styles.imageUploadButton}
            onPress={() => selectImage('vehicle')}
          >
            {selectedVehicleImage ? (
              <Image
                source={{ uri: selectedVehicleImage.uri }}
                style={styles.previewImage}
              />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Icon name="camera" size={24} color="#366732" />
                <Text>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Type (e.g., Car, Bike)"
            value={newVehicleType}
            onChangeText={setNewVehicleType}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Vehicle Number"
            value={newVehicleNumber}
            onChangeText={setNewVehicleNumber}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Model (Optional)"
            value={newVehicleModel}
            onChangeText={setNewVehicleModel}
          />

          <TextInput
            style={styles.input}
            placeholder="Parking Slot Number"
            value={newParkingSlot}
            onChangeText={setNewParkingSlot}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowAddVehicleModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButtonForItem]}
              onPress={addVehicle}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        {!isEditMode ? (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditMode(true)}
          >
            <Icon name="pencil" size={22} color="#fff" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveProfile}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="content-save" size={22} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.profileImageContainer}
            onPress={isEditMode ? handleSelectProfileImage : null}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator size="large" color="#366732" />
            ) : (
              <>
                <Image 
                  source={profileImage ? { uri: profileImage } : require('../../../../assets/icon.png')} 
                  style={styles.profileImage} 
                />
                {isEditMode && (
                  <View style={styles.editImageOverlay}>
                    <Icon name="camera" size={28} color="#fff" />
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            {!isEditMode ? (
              <>
                <Text style={styles.profileName}>{userData?.name || 'Community Member'}</Text>
                <Text style={styles.apartmentId}>{userData?.apartmentId || 'No Apartment'}</Text>
                <Text style={styles.profileEmail}>{userData?.role || ''}</Text>
                <Text style={styles.profilePhone}>{userData?.phoneNumber || 'No Phone'}</Text>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  value={name}
                  onChangeText={setName}
                />
                <Text style={styles.apartmentId}>{userData?.apartmentId || 'No Apartment'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </>
            )}
          </View>
        </View>
        
        {/* Family Members Section */}
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('family')}
        >
          <View style={styles.sectionTitleContainer}>
            <Icon name="account-group" size={24} color="#366732" />
            <Text style={styles.sectionTitle}>Family Members</Text>
          </View>
          <Icon 
            name={expandedSection === 'family' ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>
        
        {expandedSection === 'family' && (
          <View style={styles.sectionContent}>
            {familyMembers.length === 0 ? (
              <Text style={styles.emptyText}>No family members added yet</Text>
            ) : (
              familyMembers.map((member) => (
                <View key={member.id} style={styles.listItem}>
                  {member.imageUrl && (
                    <Image
                      source={{ uri: member.imageUrl }}
                      style={styles.listItemImage}
                    />
                  )}
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>{member.name}</Text>
                    <Text style={styles.listItemSubtitle}>{member.relation}</Text>
                    {member.phone && (
                      <Text style={styles.listItemPhone}>{member.phone}</Text>
                    )}
                  </View>
                  {isEditMode && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFamilyMember(member.id)}
                    >
                      <Icon name="delete" size={20} color="#f44336" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
            
            {isEditMode && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddMemberModal(true)}
              >
                <Icon name="plus" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Member</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Staff Section */}
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('staff')}
        >
          <View style={styles.sectionTitleContainer}>
            <Icon name="account-tie" size={24} color="#366732" />
            <Text style={styles.sectionTitle}>Staff</Text>
          </View>
          <Icon 
            name={expandedSection === 'staff' ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>
        
        {expandedSection === 'staff' && (
          <View style={styles.sectionContent}>
            {staffMembers.length === 0 ? (
              <Text style={styles.emptyText}>No staff members added yet</Text>
            ) : (
              staffMembers.map((staff) => (
                <View key={staff.id} style={styles.listItem}>
                  {staff.imageUrl && (
                    <Image
                      source={{ uri: staff.imageUrl }}
                      style={styles.listItemImage}
                    />
                  )}
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>{staff.name}</Text>
                    <Text style={styles.listItemSubtitle}>{staff.role}</Text>
                    {staff.phone && (
                      <Text style={styles.listItemPhone}>{staff.phone}</Text>
                    )}
                  </View>
                  {isEditMode && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeStaffMember(staff.id)}
                    >
                      <Icon name="delete" size={20} color="#f44336" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
            
            {isEditMode && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddStaffModal(true)}
              >
                <Icon name="plus" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Staff</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Vehicles Section */}
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('vehicles')}
        >
          <View style={styles.sectionTitleContainer}>
            <Icon name="car" size={24} color="#366732" />
            <Text style={styles.sectionTitle}>Vehicles</Text>
          </View>
          <Icon 
            name={expandedSection === 'vehicles' ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>
        
        {expandedSection === 'vehicles' && (
          <View style={styles.sectionContent}>
            {vehicles.length === 0 ? (
              <Text style={styles.emptyText}>No vehicles added yet</Text>
            ) : (
              vehicles.map((vehicle) => (
                <View key={vehicle.id} style={styles.listItem}>
                  {vehicle.imageUrl && (
                    <Image
                      source={{ uri: vehicle.imageUrl }}
                      style={styles.listItemImage}
                    />
                  )}
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>{vehicle.number}</Text>
                    <Text style={styles.listItemSubtitle}>{vehicle.type}{vehicle.model ? ` - ${vehicle?.model}` : ''}</Text>
                    <Text style={styles.listItemSubtitle}>Parking Slot: {vehicle.model ? ` ${vehicle?.parkingSlot}` : ''}</Text>
                  </View>
                  {isEditMode && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeVehicle(vehicle.id)}
                    >
                      <Icon name="delete" size={20} color="#f44336" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
            
            {isEditMode && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddVehicleModal(true)}
              >
                <Icon name="plus" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Vehicle</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Privacy Settings */}
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('privacy')}
        >
          <View style={styles.sectionTitleContainer}>
            <Icon name="shield-account" size={24} color="#366732" />
            <Text style={styles.sectionTitle}>Data Privacy</Text>
          </View>
          <Icon 
            name={expandedSection === 'privacy' ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>
        
        {expandedSection === 'privacy' && (
          <View style={styles.sectionContent}>
            <View style={styles.privacyItem}>
              <View style={styles.privacyItemContent}>
                <Text style={styles.privacyItemTitle}>Share Contact Information</Text>
                <Text style={styles.privacyItemDescription}>Allow community members to see your contact details</Text>
              </View>
              <Switch
                value={privacySettings.shareContactInfo}
                onValueChange={() => isEditMode && handlePrivacyToggle('shareContactInfo')}
                trackColor={{ false: "#767577", true: "#a4d3a0" }}
                thumbColor={privacySettings.shareContactInfo ? "#366732" : "#f4f3f4"}
                disabled={!isEditMode}
              />
            </View>
            
            <View style={styles.privacyItem}>
              <View style={styles.privacyItemContent}>
                <Text style={styles.privacyItemTitle}>Receive Notifications</Text>
                <Text style={styles.privacyItemDescription}>Get updates about community events and activities</Text>
              </View>
              <Switch
                value={privacySettings.receiveNotifications}
                onValueChange={() => isEditMode && handlePrivacyToggle('receiveNotifications')}
                trackColor={{ false: "#767577", true: "#a4d3a0" }}
                thumbColor={privacySettings.receiveNotifications ? "#366732" : "#f4f3f4"}
                disabled={!isEditMode}
              />
            </View>
            
            <View style={styles.privacyItem}>
              <View style={styles.privacyItemContent}>
                <Text style={styles.privacyItemTitle}>Show in Community Directory</Text>
                <Text style={styles.privacyItemDescription}>Include your profile in the community directory</Text>
              </View>
              <Switch
                value={privacySettings.showProfileInDirectory}
                onValueChange={() => isEditMode && handlePrivacyToggle('showProfileInDirectory')}
                trackColor={{ false: "#767577", true: "#a4d3a0" }}
                thumbColor={privacySettings.showProfileInDirectory ? "#366732" : "#f4f3f4"}
                disabled={!isEditMode}
              />
            </View>
          </View>
        )}

<Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.feedbackModalOverlay}>
          <View style={styles.feedbackModalContainer}>
            <Text style={styles.feedbackModalTitle}>Feedback</Text>

            <TextInput
              placeholder="Your Email"
              value={email}
              onChangeText={setEmail}
              style={styles.feedbackInput}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Your Feedback"
              value={feedback}
              onChangeText={setFeedback}
              style={[styles.feedbackInput, styles.textArea]}
              multiline
              numberOfLines={5}
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
              <Text style={styles.submitButtonText}>{submitting ? 'Sending...' : 'Submit'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
        
        {/* Other Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.optionButton} onPress={() => setModalVisible(true)}>
            <Icon name="message-text-outline" size={24} color="#366732" />
            <Text style={styles.optionText}>Send Feedback</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.optionButton} onPress={handleLogout}>
            <Icon name="logout" size={24} color="#f44336" />
            <Text style={[styles.optionText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {renderAddMemberModal()}
      {renderAddStaffModal()}
      {renderAddVehicleModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#366732',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation:3
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom:5,
    marginLeft:70,
    paddingHorizontal:50
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editButtonText: {
    marginLeft: 4,
    color: '#fff',
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  saveButtonText: {
    marginLeft: 4,
    color: '#fff',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 15,
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
  },
profileImageContainer: {
  position: 'relative',
  marginRight: 16,
},
profileImage: {
  width: 80,
  height: 80,
  borderRadius: 40,
  backgroundColor: '#e0e0e0',
},
editImageOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 78,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  borderRadius: 40,
  justifyContent: 'center',
  alignItems: 'center',
},
profileInfo: {
  flex: 1,
  justifyContent: 'center',
},
profileName: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 4,
},
apartmentId: {
  fontSize: 14,
  color: '#666',
  marginBottom: 4,
},
profileEmail: {
  fontSize: 14,
  color: '#666',
  marginBottom: 4,
},
profilePhone: {
  fontSize: 14,
  color: '#666',
},
sectionHeader: {
  backgroundColor: '#fff',
  marginHorizontal: 16,
  marginTop: 16,
  borderRadius: 12,
  padding: 16,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
sectionTitleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},
sectionTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#333',
  marginLeft: 8,
},
sectionContent: {
  backgroundColor: '#fff',
  marginHorizontal: 16,
  marginTop: 2,
  borderBottomLeftRadius: 12,
  borderBottomRightRadius: 12,
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,
  padding: 16,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
emptyText: {
  color: '#888',
  fontStyle: 'italic',
  textAlign: 'center',
  paddingVertical: 16,
},
listItem: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},
listItemContent: {
  flex: 1,
},
listItemTitle: {
  fontSize: 16,
  fontWeight: '500',
  color: '#333',
  marginBottom: 2,
},
listItemSubtitle: {
  fontSize: 14,
  color: '#666',
  marginBottom: 2,
},
listItemPhone: {
  fontSize: 14,
  color: '#666',
},
removeButton: {
  padding: 8,
},
addButton: {
  flexDirection: 'row',
  backgroundColor: '#366732',
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
  alignSelf: 'center',
  marginTop: 16,
  alignItems: 'center',
},
addButtonText: {
  color: '#fff',
  marginLeft: 6,
  fontWeight: '500',
},
privacyItem: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},
privacyItemContent: {
  flex: 1,
  paddingRight: 12,
},
privacyItemTitle: {
  fontSize: 16,
  fontWeight: '500',
  color: '#333',
  marginBottom: 2,
},
privacyItemDescription: {
  fontSize: 14,
  color: '#666',
},
optionsContainer: {
  marginHorizontal: 16,
  marginTop: 24,
  marginBottom: 32,
},
optionButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff',
  padding: 16,
  borderRadius: 12,
  marginBottom: 12,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
optionText: {
  marginLeft: 12,
  fontSize: 16,
  color: '#333',
  fontWeight: '500',
},
logoutText: {
  color: '#f44336',
},
input: {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  padding: 8,
  marginBottom: 8,
  fontSize: 14,
  backgroundColor: '#f9f9f9',
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContent: {
  backgroundColor: '#fff',
  width: '80%',
  borderRadius: 12,
  padding: 20,
  elevation: 5,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
},
modalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 16,
  color: '#366732',
  textAlign: 'center',
},
modalButtons: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 20,
},
modalButton: {
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 8,
  flex: 0.45,
  alignItems: 'center',
},
cancelButton: {
  backgroundColor: '#f2f2f2',
},
saveButtonForItem: {
  backgroundColor: '#008000',
},
cancelButtonText: {
  color: '#666',
  fontWeight: '500',
},
feedbackModalOverlay: {
  flex: 1,
  justifyContent: 'flex-end',
  backgroundColor: 'rgba(0,0,0,0.5)',
},
feedbackModalContainer: {
  backgroundColor: '#fff',
  padding: 20,
  borderTopRightRadius: 20,
  borderTopLeftRadius: 20,
},
feedbackModalTitle: {
  fontSize: 18,
  fontWeight: '600',
  marginBottom: 15,
  marginLeft:'35%'
},
feedbackInput: {
  borderWidth: 1,
  borderColor: '#ccc',
  padding: 10,
  borderRadius: 8,
  marginBottom: 15,
},
textArea: {
  height: 100,
  textAlignVertical: 'top',
},
submitButton: {
  backgroundColor: '#366732',
  padding: 12,
  borderRadius: 8,
  alignItems: 'center',
},
submitButtonText: {
  color: '#fff',
  fontSize: 16,
},
closeText: {
  marginTop: 20,
  textAlign: 'center',
  color: '#666',
  marginBottom:20
},
imageUploadButton: {
  width: 100,
  height: 100,
  borderRadius: 50,
  backgroundColor: '#f0f0f0',
  alignSelf: 'center',
  marginBottom: 16,
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
},
previewImage: {
  width: '100%',
  height: '100%',
},
uploadPlaceholder: {
  alignItems: 'center',
  justifyContent: 'center',
},
listItemImage: {
  width: 70,
  height: 70,
  borderRadius: 5,
  marginRight: 12,
},
});

export default ProfileScreen;