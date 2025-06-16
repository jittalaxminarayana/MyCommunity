import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';

const AddUserScreen = () => {
  const navigation = useNavigation();
  const { communityData } = useSelector((state) => state.user);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [apartmentId, setApartmentId] = useState('');
  const [role, setRole] = useState('Resident');
  const [occupancyStatus, setOccupancyStatus] = useState('tenant');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email || !phone || !apartmentId) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('users')
        .add({
          name,
          email,
          phoneNumber: phone,
          apartmentId,
          role,
          occupancyStatus,
          approved: true,
          createdAt: firestore.FieldValue.serverTimestamp(),
          profileImageUrl: '',
          staffMembers: [],
          vehicles: [],
          tokens: []
        });

      Alert.alert('Success', 'User added successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding user: ', error);
      Alert.alert('Error', 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.headerTitle}>Add New User</Text>
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
              {['Resident', 'Admin', 'Security'].map((r) => (
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

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add User</Text>
              )}
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
});

export default AddUserScreen;