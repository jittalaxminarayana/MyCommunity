import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Platform, 
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';

const EditUserScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = route.params;
  const { communityData } = useSelector((state) => state.user);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [apartmentId, setApartmentId] = useState('');
  const [role, setRole] = useState('resident');
  const [occupancyStatus, setOccupancyStatus] = useState('tenant');
  const [approved, setApproved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userDoc = await firestore()
          .collection('communities')
          .doc(communityData.id)
          .collection('users')
          .doc(userId)
          .get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          setName(userData.name);
          setEmail(userData.email);
          setPhone(userData.phoneNumber);
          setApartmentId(userData.apartmentId);
          setRole(userData.role);
          setOccupancyStatus(userData.occupancyStatus);
          setApproved(userData.approved);
        }
      } catch (error) {
        console.error('Error fetching user: ', error);
        Alert.alert('Error', 'Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, communityData.id]);

  const handleUpdate = async () => {
    if (!name || !email || !phone || !apartmentId) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setUpdating(true);
    try {
      await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('users')
        .doc(userId)
        .update({
          name,
          email,
          phoneNumber: phone,
          apartmentId,
          role,
          occupancyStatus,
          approved
        });

      Alert.alert('Success', 'User updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating user: ', error);
      Alert.alert('Error', 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('users')
                .doc(userId)
                .delete();

              Alert.alert('Success', 'User deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting user: ', error);
              Alert.alert('Error', 'Failed to delete user');
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
          <Text style={styles.headerTitle}>Edit User</Text>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#366732" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
              <Icon name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit User</Text>
          </View>

          <ScrollView 
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Full Name*</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter user's full name"
              returnKeyType="next"
            />

            <Text style={styles.label}>Email*</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter user's email"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            <Text style={styles.label}>Phone Number*</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              returnKeyType="next"
            />

            <Text style={styles.label}>Apartment ID*</Text>
            <TextInput
              style={styles.input}
              value={apartmentId}
              onChangeText={setApartmentId}
              placeholder="e.g. B-303"
              returnKeyType="done"
            />

            <Text style={styles.label}>Role</Text>
            <View style={styles.radioGroup}>
              {['resident', 'admin', 'security'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.radioButton,
                    role === r && styles.radioButtonSelected
                  ]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[
                    styles.radioButtonText,
                    role === r && styles.radioButtonSelectedText
                  ]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Occupancy Status</Text>
            <View style={styles.radioGroup}>
              {['owner', 'tenant'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.radioButton,
                    occupancyStatus === status && styles.radioButtonSelected
                  ]}
                  onPress={() => setOccupancyStatus(status)}
                >
                  <Text style={[
                    styles.radioButtonText,
                    occupancyStatus === status && styles.radioButtonSelectedText
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Approved User</Text>
              <TouchableOpacity
                style={[
                  styles.switchButton,
                  approved ? styles.switchButtonOn : styles.switchButtonOff
                ]}
                onPress={() => setApproved(!approved)}
              >
                <Text style={styles.switchText}>
                  {approved ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleUpdate}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Update User</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={handleDelete}
            >
              <Text style={styles.deleteButtonText}>Delete User</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
    paddingBottom: 40, // Extra padding for scroll
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
  radioGroup: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  radioButton: {
    flex: 1,
    marginHorizontal: 5,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#366732',
  },
  radioButtonText: {
    color: '#333',
  },
  radioButtonSelectedText: {
    color: '#fff',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  switchButton: {
    width: 60,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchButtonOn: {
    backgroundColor: '#4CAF50',
  },
  switchButtonOff: {
    backgroundColor: '#F44336',
  },
  switchText: {
    color: '#fff',
    fontWeight: 'bold',
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

export default EditUserScreen;