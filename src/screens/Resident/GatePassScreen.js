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
    console.log("userData",userData)
    const communityData = useSelector((state) => state.user.communityData);

    // Form state
    const [visitorName, setVisitorName] = useState('');
    const [visitorPhone, setVisitorPhone] = useState('');
    const [purpose, setPurpose] = useState('guest');
    const [validFrom, setValidFrom] = useState(new Date());
    const [validTo, setValidTo] = useState(new Date(new Date().setDate(new Date().getDate() + 1)));
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [note, setNote] = useState('');
    const [durationType, setDurationType] = useState('hours'); // 'hours', 'days', 'custom'

    // UI states
    const [loading, setLoading] = useState(false);
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);

    // Generate a random 6-digit PIN
    const generatePIN = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    // Handle duration type change
    const handleDurationTypeChange = (type) => {
        setDurationType(type);
        const now = new Date();
        setValidFrom(now);

        switch (type) {
            case 'hours':
                setValidTo(new Date(now.getTime() + 2 * 60 * 60 * 1000)); // 2 hours
                break;
            case 'day':
                setValidTo(new Date(now.getTime() + 24 * 60 * 60 * 1000)); // 1 day
                break;
            case 'days':
                setValidTo(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)); // 3 days
                break;
            case 'custom':
                // Keep current dates
                break;
        }
    };

    // Handle creating a new gate pass request
    const handleCreateRequest = async () => {
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
            const pinCode = generatePIN();

            // Create gate pass request
            const requestData = {
                visitorName,
                visitorPhone,
                purpose,
                validFrom: firebase.firestore.Timestamp.fromDate(validFrom),
                validTo: firebase.firestore.Timestamp.fromDate(validTo),
                vehicleNumber: vehicleNumber || null,
                notes: note || null,
                pinCode,
                status: 'pending',
                requestedByUserId: userData.id,
                requestedByRole:userData.role,
                requestedByName: userData.name,
                apartmentId: userData.apartmentId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                securityImages: [],
            };

            await firebase.firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('gatePassRequests')
                .add(requestData);


            await firebase.firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('gatePasses')
                .add({
                    visitorName,
                    visitorPhone,
                    purpose,
                    validFrom: firebase.firestore.Timestamp.fromDate(validFrom),
                    validTo: firebase.firestore.Timestamp.fromDate(validTo),
                    vehicleNumber: vehicleNumber || null,
                    notes: note || null,
                    pin: pinCode,
                    status: 'active',
                    requestedByUserId: userData.id,
                    requestedByRole:userData.role,
                    requestedByName: userData.name,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });

            // Reset form
            setVisitorName('');
            setVisitorPhone('');
            setPurpose('guest');
            setVehicleNumber('');
            setNote('');
            setValidFrom(new Date());
            setValidTo(new Date(new Date().setDate(new Date().getDate() + 1)));
            setDurationType('hours');

            Alert.alert('Success', 'Gate pass request created successfully!');
            navigation.goBack();
        } catch (error) {
            console.error('Error creating gate pass request:', error);
            Alert.alert('Error', 'Failed to create gate pass request. Please try again.');
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
                <Text style={styles.headerTitle}>Create Gate Pass Request</Text>
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

                <View style={styles.durationOptions}>
                    <TouchableOpacity
                        style={[styles.durationButton, durationType === 'hours' && styles.activeDuration]}
                        onPress={() => handleDurationTypeChange('hours')}
                    >
                        <Text style={[styles.durationText, durationType === 'hours' && styles.activeDurationText]}>2 Hours</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.durationButton, durationType === 'day' && styles.activeDuration]}
                        onPress={() => handleDurationTypeChange('day')}
                    >
                        <Text style={[styles.durationText, durationType === 'day' && styles.activeDurationText]}>1 Day</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.durationButton, durationType === 'days' && styles.activeDuration]}
                        onPress={() => handleDurationTypeChange('days')}
                    >
                        <Text style={[styles.durationText, durationType === 'days' && styles.activeDurationText]}>3 Days</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.durationButton, durationType === 'custom' && styles.activeDuration]}
                        onPress={() => handleDurationTypeChange('custom')}
                    >
                        <Text style={[styles.durationText, durationType === 'custom' && styles.activeDurationText]}>Custom</Text>
                    </TouchableOpacity>
                </View>

                {durationType === 'custom' && (
                    <>
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
                                    minimumDate={validFrom}
                                />
                            )}
                        </View>
                    </>
                )}

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
                    onPress={handleCreateRequest}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Icon name="send" size={20} color="#fff" />
                            <Text style={styles.submitButtonText}>Submit Request</Text>
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
        paddingTop: 30
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
        backgroundColor: '#e6e6e6',
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
    durationOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    durationButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fff',
    },
    activeDuration: {
        backgroundColor: '#366732',
        borderColor: '#366732',
    },
    durationText: {
        fontSize: 14,
        color: '#333',
    },
    activeDurationText: {
        color: '#fff',
    },
});

export default GatePassScreen;