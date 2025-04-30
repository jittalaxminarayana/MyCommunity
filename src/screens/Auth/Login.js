import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { setUserData, setCommunityData } from '../../store/Slices/userSlice';

const Login = ({ route, navigation }) => {
  const { community } = route.params;
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [userData, setUserData1] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTimer => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  
  const checkUserExists = async () => {
    try {
      console.log("Checking user with phone number:", phoneNumber);
    
      
      // Get all users in the community
      const userSnapshot = await firestore()
        .collection('communities')
        .doc(community.id)
        .collection('users')
        .get();
      
      console.log(`Retrieved ${userSnapshot.docs.length} users from community`);
      
      // Check if any user has the matching phone number
      let foundUser = null;
      for (const doc of userSnapshot.docs) {
        const userData = doc.data();
        console.log(`Comparing: "${userData.phoneNumber}" with "${phoneNumber}"`);
        
        if (userData.phoneNumber == phoneNumber) {
          foundUser = {
            id: doc.id,
            ...userData
          };
          setUserData1(foundUser);
          break;
        }
      }
      
      if (!foundUser) {
        Alert.alert(
          "User Not Found",
          "This phone number is not registered with this community. Please contact your community administrator.",
          [{ text: "OK" }]
        );
        return false;
      }
      
      if (!foundUser.approved) {
        Alert.alert(
          "Account Pending Approval",
          "Your account is waiting for administrator approval. Please try again later.",
          [{ text: "OK" }]
        );
        return false;
      }
      
      console.log("User found with ID:", foundUser.id);
      return true;
      
    } catch (error) {
      console.error('Error checking user:', error);
      Alert.alert("Error", "Failed to verify user. Please try again.");
      return false;
    }
  };
  

  const signInWithPhoneNumber = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert("Invalid Number", "Please enter a valid phone number");
      return;
    }
  
    try {
      setLoading(true);
      
      const userExists = await checkUserExists();
      if (!userExists) {
        setLoading(false);
        return;
      }
  
      // Format the phone number with the country code
      const formattedNumber = `+91${phoneNumber}`;
      console.log("formattedNumber",formattedNumber)
      
      const confirmation = await auth().signInWithPhoneNumber(formattedNumber);
      console.log("confirmation",confirmation)
      setConfirm(confirmation);
      setTimer(60); // Start a 60-second timer for resend
    } catch (error) {
      console.error('Error sending code:', error);
      Alert.alert(
        "Error", 
        "Failed to send verification code. Please check your number and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    if (!code || code.length < 6) {
      Alert.alert("Invalid Code", "Please enter a valid verification code");
      return;
    }
    try {
      setLoading(true);
      const userCredential = await confirm.confirm(code);
      console.log("User signed in:", userCredential.user.uid);
      console.log(userData.id, community.id)

      // First update Redux state
      dispatch(setUserData(userData));
      dispatch(setCommunityData(community));

      // store in async storage both commnity id and user id
      await AsyncStorage.setItem('@userDataId', userData.id.toString());
      await AsyncStorage.setItem('@communityDataId', community.id.toString());

      navigation.reset({
        index: 0,
        routes: [{ name: 'Root' }],
      });

    } catch (error) {
      console.error('Error confirming code:', error);
      Alert.alert("Invalid Code", "The verification code is invalid. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  

  const resendCode = () => {
    setConfirm(null);
    setCode('');
    signInWithPhoneNumber();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Icon name="arrow-left" size={24} color="#fff" onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>{}</Text>
          <View style={{ width: 24 }} /> {/* Empty view for layout balance */}
        </View>

        <View style={styles.formContainer}>
          <View style={styles.welcomeSection}>
            <Icon name="home-city" size={50} color="#366732" />
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in to access your {community.name} community
            </Text>
          </View>

          {!confirm ? (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Enter your registered phone number</Text>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.countryCode}>+91</Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                  }}
                  placeholder="Phone Number"
                  keyboardType="phone-pad"
                  style={styles.input}
                  maxLength={10}
                />
              </View>

              <TouchableOpacity 
                style={styles.submitButton}
                onPress={signInWithPhoneNumber}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Enter verification code</Text>
              <Text style={styles.otpMessage}>
                We've sent a 6-digit code to {phoneNumber}
              </Text>
              
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                style={styles.otpInput}
                maxLength={6}
              />

              <TouchableOpacity 
                style={styles.submitButton}
                onPress={confirmCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resendButton}
                onPress={resendCode}
                disabled={timer > 0}
              >
                <Text style={[
                  styles.resendText, 
                  timer > 0 && styles.resendTextDisabled
                ]}>
                  {timer > 0 
                    ? `Resend code in ${timer}s` 
                    : "Resend verification code"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  container: {
    flex: 1,
    backgroundColor: '#366732',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#366732',
    marginTop: 15,
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 25,
  },
  countryCode: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
    borderRightWidth: 1,
    borderRightColor: '#ccc',
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 25,
    fontSize: 20,
    letterSpacing: 2,
    textAlign: 'center',
    padding:10
  },
  submitButton: {
    backgroundColor: '#f68422',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 20,
    padding: 10,
  },
  resendText: {
    color: '#366732',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  resendTextDisabled: {
    color: '#888',
    textDecorationLine: 'none',
  },
  otpMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
});

export default Login;