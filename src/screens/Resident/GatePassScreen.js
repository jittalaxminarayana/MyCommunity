import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { firebase } from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';

const GatePassScreen = ({ navigation }) => {
    const userData = useSelector((state) => state.user.userData);
    const communityData = useSelector((state) => state.user.communityData);

    // Gate pass form data
    const [visitorName, setVisitorName] = useState('');
    const [visitorPhone, setVisitorPhone] = useState('');
    const [purpose, setPurpose] = useState('guest');
    const [validFrom, setValidFrom] = useState(new Date());
    const [validTo, setValidTo] = useState(new Date(new Date().setDate(new Date().getDate() + 1)));
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [note, setNote] = useState('');

    // UI states
    const [loading, setLoading] = useState(false);
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);

    // Generate a random 6-digit PIN
    const generatePIN = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    // Handle creating a new gate pass
    const handleCreatePass = async () => {
        // Validate form data
        if (!visitorName.trim() || !visitorPhone.trim()) {
            Alert.alert('Missing Information', 'Please enter visitor name and phone number.');
            return;
        }

        if (validFrom > validTo) {
            Alert.alert('Invalid Date Range', 'Valid from date must be before valid to date.');
            return;
        }

        setLoading(true);

        try {
            // Generate a PIN for verification
            const pin = generatePIN();

            // Create visitor record first
            const visitorRef = await firebase.firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('visitors')
                .add({
                    name: visitorName,
                    phoneNumber: visitorPhone,
                    hostUserId: userData.id,
                    apartmentId: userData.apartmentId,
                    purpose: purpose,
                    status: 'expected',
                    vehicleNumber: vehicleNumber || null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Create gate pass record
            const passData = {
                visitorId: visitorRef.id,
                visitorName: visitorName,
                visitorPhone: visitorPhone,
                generatedBy: userData.id,
                generatedByName: userData.name,
                apartmentId: userData.apartmentId,
                validFrom: firebase.firestore.Timestamp.fromDate(validFrom),
                validTo: firebase.firestore.Timestamp.fromDate(validTo),
                purpose: purpose,
                vehicleNumber: vehicleNumber || null,
                note: note || null,
                pin: pin,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await firebase.firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('gatePasses')
                .add(passData);

            // Reset form
            setVisitorName('');
            setVisitorPhone('');
            setPurpose('guest');
            setVehicleNumber('');
            setNote('');
            setValidFrom(new Date());
            setValidTo(new Date(new Date().setDate(new Date().getDate() + 1)));

            Alert.alert('Success', 'Gate pass created successfully!');
            navigation.navigate('GatePassHistoryScreen');
        } catch (error) {
            console.error('Error creating gate pass:', error);
            Alert.alert('Error', 'Failed to create gate pass. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Gate Pass</Text>
                <View style={styles.headerRightSpace}></View>
            </View>

            <ScrollView style={styles.formContainer}>
                <Text style={styles.formSectionTitle}>Visitor Information</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Visitor Name <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.textInput}
                        value={visitorName}
                        onChangeText={setVisitorName}
                        placeholder="Enter visitor name"
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Phone Number <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.textInput}
                        value={visitorPhone}
                        onChangeText={setVisitorPhone}
                        placeholder="Enter visitor phone number"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Purpose</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={purpose}
                            onValueChange={(itemValue) => setPurpose(itemValue)}
                            style={styles.picker}
                            placeholder='To whom you want gatepass'
                        >
                            <Picker.Item label="Guest" value="guest" />
                            <Picker.Item label="Delivery" value="delivery" />
                            <Picker.Item label="Staff/Worker" value="staff" />
                            <Picker.Item label="Cab/Taxi" value="cab" />
                            <Picker.Item label="Other" value="other" />
                        </Picker>
                    </View>
                </View>

                <Text style={styles.formSectionTitle}>Validity Period</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Valid From</Text>
                    <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowFromDatePicker(true)}
                    >
                        <Text>{format(validFrom, 'MMM dd, yyyy h:mm a')}</Text>
                        <Icon name="calendar" size={20} color="#366732" />
                    </TouchableOpacity>
                    {showFromDatePicker && (
                        <DateTimePicker
                            value={validFrom}
                            mode="datetime"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowFromDatePicker(false);
                                if (selectedDate) {
                                    setValidFrom(selectedDate);
                                }
                            }}
                        />
                    )}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Valid To</Text>
                    <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowToDatePicker(true)}
                    >
                        <Text>{format(validTo, 'MMM dd, yyyy h:mm a')}</Text>
                        <Icon name="calendar" size={20} color="#366732" />
                    </TouchableOpacity>
                    {showToDatePicker && (
                        <DateTimePicker
                            value={validTo}
                            mode="datetime"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowToDatePicker(false);
                                if (selectedDate) {
                                    setValidTo(selectedDate);
                                }
                            }}
                        />
                    )}
                </View>

                <Text style={styles.formSectionTitle}>Additional Information</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Vehicle Number (Optional)</Text>
                    <TextInput
                        style={styles.textInput}
                        value={vehicleNumber}
                        onChangeText={setVehicleNumber}
                        placeholder="Enter vehicle number if applicable"
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Note (Optional)</Text>
                    <TextInput
                        style={[styles.textInput, styles.textArea]}
                        value={note}
                        onChangeText={setNote}
                        placeholder="Add any additional notes or instructions"
                        placeholderTextColor="#999"
                        multiline={true}
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleCreatePass}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Icon name="qrcode-plus" size={20} color="#fff" />
                            <Text style={styles.submitButtonText}>Generate Pass</Text>
                        </>
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
        paddingTop:30
      },
      headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
      },
      backButton: {
        padding: 5,
      },
      headerRightSpace: {
        width: 24, // This creates balance with the back button on the left
      },
    formContainer: {
        padding: 16,
    },
    formSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#366732',
        marginTop: 16,
        marginBottom: 12,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        marginBottom: 6,
        color: '#333',
    },
    required: {
        color: '#e74c3c',
    },
    textInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        backgroundColor:'#e6e6e6',
    },
    dateInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    submitButton: {
        backgroundColor: '#366732',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default GatePassScreen;