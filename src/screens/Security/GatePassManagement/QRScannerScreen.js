import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Linking, 
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Camera, CameraType } from 'react-native-camera-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';


const QRScannerScreen = () => {
  const navigation = useNavigation();
  const userData = useSelector((state) => state?.user?.userData);
  console.log("userData:", userData)
  const communityData = useSelector((state) => state?.user?.communityData);
  
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentGatePass, setCurrentGatePass] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const cameraRef = useRef(null);
  console.log("currentGatePass:", currentGatePass)

  // Request camera permission
  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: "Camera Permission",
              message: "This app needs access to your camera to scan QR codes.",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            }
          );
          setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        } else {
          // iOS permissions are handled by Info.plist
          setHasPermission(true);
        }
      } catch (err) {
        console.warn(err);
        setHasPermission(false);
      }
    };

    requestCameraPermission();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const backAction = () => {
        if (showDetails) {
          setShowDetails(false);
          setScanned(false);
          return true;
        }
        return false;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => backHandler.remove();
    }, [showDetails])
  );

  const handleBarcodeScanned = async (event) => {
    if (scanned || !event.nativeEvent.codeStringValue) return;
  
    try {
      setScanned(true);
      setLoading(true);
  
      // Parse scanned string to JSON
      const gatePassId = JSON.parse(event.nativeEvent.codeStringValue);
      console.log("Parsed gatePassId:", gatePassId);
  
      const gatePassRef = firestore()
        .collection('communities')
        .doc(gatePassId.communityId) // Use communityId from QR
        .collection('gatePasses')
        .doc(gatePassId.passId); // Use passId from QR
  
      const doc = await gatePassRef.get();
      console.log("Fetched gate pass doc:", doc);
  
      if (!doc.exists) {
        Alert.alert(
          "Invalid QR Code",
          "This QR code is not associated with any valid gate pass.",
          [{ text: "OK", onPress: () => setScanned(false) }]
        );
        setLoading(false);
        return;
      }
  
      const gatePassData = doc.data();
      const now = new Date();
      const validTo = gatePassData.validTo.toDate();
  
      if (gatePassData.status === 'used') {
        Alert.alert("Gate Pass Already Used", "This gate pass has already been used.", [
          { text: "OK", onPress: () => setScanned(false) }
        ]);
        setLoading(false);
        return;
      }
  
      if (gatePassData.status === 'expired' || now > validTo) {
        Alert.alert("Gate Pass Expired", "This gate pass has expired.", [
          { text: "OK", onPress: () => setScanned(false) }
        ]);
        setLoading(false);
        return;
      }
  
      setCurrentGatePass({
        id: doc.id,
        ...gatePassData,
        validFrom: gatePassData.validFrom.toDate(),
        validTo: gatePassData.validTo.toDate(),
        createdAt: gatePassData.createdAt.toDate()
      });
  
      setShowDetails(true);
      setLoading(false);
  
    } catch (error) {
      console.error("Error processing QR code:", error);
      Alert.alert("Error", "There was an error processing the QR code.", [
        { text: "OK", onPress: () => setScanned(false) }
      ]);
      setLoading(false);
    }
  };
  

  const handleMarkAsUsed = async () => {
    try {
      setLoading(true);
      
      // Update the gate pass status to 'used'
      await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('gatePasses')
        .doc(currentGatePass.id)
        .update({
          status: 'used',
          updatedAt: firestore.FieldValue.serverTimestamp(),
          checkedInBy: userData?.id,
          checkedInByName: userData?.name
        });
      
      // Create a visitor log entry
      await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('visitors')
        .add({
          visitorName: currentGatePass?.visitorName,
          visitorPhone: currentGatePass?.visitorPhone,
          hostUserId: currentGatePass?.generatedBy,
          hostName: currentGatePass?.generatedByName,
          apartmentId: currentGatePass?.apartmentId,
          purpose: currentGatePass?.purpose,
          entryTime: firestore.FieldValue.serverTimestamp(),
          status: 'checked-in',
          vehicleNumber: currentGatePass?.vehicleNumber || '',
          gatePassId: currentGatePass?.id,
          processedBy: userData?.id,
          processedByName: userData?.name
        });
      
      Alert.alert(
        "Success",
        "Visitor has been checked in successfully.",
        [{ text: "OK", onPress: () => {
          setScanned(false);
          setShowDetails(false);
          setCurrentGatePass(null);
        }}]
      );
    } catch (error) {
      console.error("Error updating gate pass:", error);
      Alert.alert(
        "Error",
        "There was an error updating the gate pass status.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCallVisitor = () => {
    if (currentGatePass?.visitorPhone) {
      Linking.openURL(`tel:${currentGatePass.visitorPhone}`);
    }
  };

  const handleCallHost = () => {
    // In a real app, you would fetch the host's phone number from user data
    Alert.alert(
      "Call Host",
      "This would call the apartment resident who generated this gate pass.",
      [{ text: "OK" }]
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Requesting for camera permission</Text>
      </View>
    );
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.permissionDeniedContainer}>
        <Icon name="camera-off" size={50} color="#666" style={styles.cameraIcon} />
        <Text style={styles.permissionText}>Camera permission is required to scan QR codes</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#366732" />
        <Text style={styles.loadingText}>Processing QR Code...</Text>
      </View>
    );
  }

  if (showDetails && currentGatePass) {
    return (
      <View style={styles.container2}>
        <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>Visitor Details</Text>
            <TouchableOpacity onPress={() => {
              setShowDetails(false);
              setScanned(false);
            }}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Icon name="account" size={20} color="#366732" />
            <Text style={styles.detailText}>{currentGatePass.visitorName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="phone" size={20} color="#366732" />
            <Text style={styles.detailText}>{currentGatePass.visitorPhone}</Text>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={handleCallVisitor}
            >
              <Icon name="phone" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="home" size={20} color="#366732" />
            <Text style={styles.detailText}>Apartment: {currentGatePass.apartmentId}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="account" size={20} color="#366732" />
            <Text style={styles.detailText}>Host: {currentGatePass.generatedByName}</Text>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={handleCallHost}
            >
              <Icon name="phone" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {currentGatePass.vehicleNumber && (
            <View style={styles.detailRow}>
              <Icon name="car" size={20} color="#366732" />
              <Text style={styles.detailText}>Vehicle: {currentGatePass.vehicleNumber}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Icon name="clock" size={20} color="#366732" />
            <Text style={styles.detailText}>
              Valid: {currentGatePass.validFrom.toLocaleTimeString()} - {currentGatePass.validTo.toLocaleTimeString()}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="information" size={20} color="#366732" />
            <Text style={styles.detailText}>Purpose: {currentGatePass.purpose}</Text>
          </View>
          
          {currentGatePass.pinCode && (
            <View style={styles.detailRow}>
              <Icon name="lock" size={20} color="#366732" />
              <Text style={styles.detailText}>PIN: {currentGatePass.pinCode}</Text>
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.verifyButton]}
              onPress={handleMarkAsUsed}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="check" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Check In Visitor</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        cameraType={CameraType.Back}
        scanBarcode={true}
        onReadCode={handleBarcodeScanned}
        showFrame={true}
        laserColor="#366732"
        frameColor="#366732"
      />
      
      <View style={styles.overlay}>
        <View style={styles.topOverlay}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>Scan Gate Pass QR Code</Text>
        </View>
        
        <View style={styles.bottomOverlay}>
          <Text style={styles.instructions}>
            Align the QR code within the frame to scan
          </Text>
          <Icon name="qrcode-scan" size={40} color="#fff" style={styles.qrIcon} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  container2: {
    flex: 1,
    backgroundColor: '#fff',
  },
  camera: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#366732',
  },
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  cameraIcon: {
    marginBottom: 20,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  settingsButton: {
    backgroundColor: '#366732',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 20,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
  },
  instructions: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  qrIcon: {
    opacity: 0.7,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  detailsHeader: {
    backgroundColor: '#366732',
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal:20
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailText: {
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  callButton: {
    backgroundColor: '#366732',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  buttonContainer: {
    marginTop: 30,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  verifyButton: {
    backgroundColor: '#366732',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default QRScannerScreen;