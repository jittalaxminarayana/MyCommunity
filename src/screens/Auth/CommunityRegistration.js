import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const CommunityRegistration = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    totalResidents: '',
    monthlyMaintenanceAmount: '2000',
  });

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter community name');
      return false;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter community address');
      return false;
    }
    if (!formData.contactEmail.trim() || !formData.contactEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!formData.contactPhone.trim() || formData.contactPhone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    if (!formData.totalResidents || parseInt(formData.totalResidents) < 1) {
      Alert.alert('Error', 'Please enter number of flats/residents');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      navigation.navigate('SubscriptionPlansScreen', { communityData: formData });
    } catch (error) {
      Alert.alert('Error', 'Failed to proceed. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Community</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <KeyboardAwareScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.formContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={100} // Increased extra scroll height
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraHeight={150} // Extra height for Android
      >
        <Text style={styles.title}>Community Details</Text>
        <Text style={styles.subtitle}>Fill in your community information</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Community Name*</Text>
          <TextInput
            style={styles.input}
            placeholder="Green Valley Community"
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Address*</Text>
          <TextInput
            style={styles.input}
            placeholder="123 Green St, City, State"
            value={formData.address}
            onChangeText={(text) => handleInputChange('address', text)}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Contact Email*</Text>
          <TextInput
            style={styles.input}
            placeholder="admin@community.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={formData.contactEmail}
            onChangeText={(text) => handleInputChange('contactEmail', text)}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Contact Phone*</Text>
          <TextInput
            style={styles.input}
            placeholder="9876543210"
            keyboardType="phone-pad"
            maxLength={10}
            value={formData.contactPhone}
            onChangeText={(text) => handleInputChange('contactPhone', text)}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Number of Flats/Residents*</Text>
          <TextInput
            style={styles.input}
            placeholder="150"
            keyboardType="numeric"
            value={formData.totalResidents}
            onChangeText={(text) => handleInputChange('totalResidents', text)}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Monthly Maintenance per Flat (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="2000"
            keyboardType="numeric"
            value={formData.monthlyMaintenanceAmount}
            onChangeText={(text) => handleInputChange('monthlyMaintenanceAmount', text)}
            returnKeyType="done"
          />
        </View>

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Continue to Subscription</Text>
          )}
        </TouchableOpacity>

        {/* Extra padding at bottom for better keyboard handling */}
        <View style={{ height: 100 }} />
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#366732',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 30
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    padding: 20,
    paddingBottom: 10, 
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#366732',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#366732',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CommunityRegistration;