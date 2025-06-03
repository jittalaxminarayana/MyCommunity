import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

const NewGatePassRequestScreen = () => {
  const navigation = useNavigation();
  const userData = useSelector((state) => state?.user?.userData);
  const communityData = useSelector((state) => state?.user?.communityData);
  
  // Form state
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [apartmentId, setApartmentId] = useState('');
  const [residentName, setResidentName] = useState('');
  const [residentId, setResidentId] = useState('');
  
  // Date/time pickers
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date(Date.now() + 3600000)); // 1 hour later
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [residents, setResidents] = useState([]);
  console.log("residents", residents)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Generate a 6-digit PIN
  const generatePin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Fetch residents for the community
  useEffect(() => {
    const fetchResidents = async () => {
      try {
        setIsSearching(true);
        const residentsRef = firestore()
          .collection('communities')
          .doc(communityData.id)
          .collection('users')
          .orderBy('name');
        
        const snapshot = await residentsRef.get();
        const residentsList = snapshot.docs.map(doc => ({
          id: doc.id,
          userId: doc.id,
          ...doc.data()
        }));
        
        // Filter only residents
        // const filteredResidents = residentsList.filter(user => 
        //   user.role === 'resident' || user.role === 'Resident'
        // );
        
        setResidents(residentsList);
      } catch (error) {
        console.error('Error fetching residents:', error);
        Alert.alert('Error', 'Failed to load resident list');
      } finally {
        setIsSearching(false);
      }
    };
    
    if (communityData?.id) {
      fetchResidents();
    }
  }, [communityData?.id]);

  // Search functionality with debouncing
  useEffect(() => {
    if (searchQuery.length > 0) {
      const debounceTimer = setTimeout(() => {
        performSearch();
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery, residents]);

  const performSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = residents.filter(resident => {
      const name = resident.name?.toLowerCase() || '';
      const apartmentId = resident.apartmentId?.toLowerCase() || '';
      const phoneNumber = resident.phoneNumber?.toString() || '';
      const email = resident.email?.toLowerCase() || '';
      
      return (
        name.includes(query) ||
        apartmentId.includes(query) ||
        phoneNumber.includes(query) ||
        email.includes(query)
      );
    });

    // Sort results by relevance
    const sorted = filtered.sort((a, b) => {
      const aName = a.name?.toLowerCase() || '';
      const aApt = a.apartmentId?.toLowerCase() || '';
      const bName = b.name?.toLowerCase() || '';
      const bApt = b.apartmentId?.toLowerCase() || '';
      
      // Exact matches first
      if (aName === query || aApt === query) return -1;
      if (bName === query || bApt === query) return 1;
      
      // Then by name alphabetically
      return aName.localeCompare(bName);
    });

    setSearchResults(sorted);
    setShowSearchResults(true);
  };

  // Handle date/time changes
  const handleFromDateChange = (event, selectedDate) => {
    setShowFromPicker(false);
    if (selectedDate) {
      setFromDate(selectedDate);
      // Auto-set end time to 1 hour after start time
      if (selectedDate > toDate) {
        setToDate(new Date(selectedDate.getTime() + 3600000));
      }
    }
  };

  const handleToDateChange = (event, selectedDate) => {
    setShowToPicker(false);
    if (selectedDate) {
      setToDate(selectedDate);
    }
  };

  // Handle resident selection
  const selectResident = (resident) => {
    setResidentId(resident.id);
    setResidentName(resident.name);
    setApartmentId(resident.apartmentId);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // Handle call functionality
  const handleCall = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  // Submit the gate pass request
  const handleSubmit = async () => {
    if (!visitorName || !visitorPhone || !residentId || !purpose) {
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }

    if (fromDate >= toDate) {
      Alert.alert('Validation Error', 'End time must be after start time');
      return;
    }

    try {
      setLoading(true);
      
      const pinCode = generatePin();
      const requestData = {
        visitorName,
        visitorPhone,
        purpose,
        validFrom: firestore.Timestamp.fromDate(fromDate),
        validTo: firestore.Timestamp.fromDate(toDate),
        vehicleNumber: vehicleNumber || null,
        notes: notes || null,
        pinCode,
        status: 'pending',
        requestedByUserId: userData.id,
        requestedByName: userData.name,
        requestedByRole:userData.role,
        apartmentId,
        createdAt: firestore.FieldValue.serverTimestamp(),
        securityImages: [],
      };

      await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('gatePassRequests')
        .add(requestData);
      
      Alert.alert(
        'Success', 
        'Gate pass request created successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      console.error('Error creating gate pass request:', error);
      Alert.alert('Error', 'Failed to create gate pass request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Gate Pass Request</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Resident Search Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Search Resident*</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name, flat number, phone, or email"
              autoCorrect={false}
            />
            <Icon name="magnify" size={24} color="#666" style={styles.searchIcon} />
          </View>
          
          {/* Selected Resident Display */}
          {residentName && (
            <View style={styles.selectedResidentContainer}>
              <Icon name="check-circle" size={20} color="#366732" />
              <Text style={styles.selectedResidentText}>
                {residentName} (Apt: {apartmentId})
              </Text>
            </View>
          )}
          
          {/* Search Results */}
          {showSearchResults && (
            <View style={styles.searchResultsContainer}>
              {isSearching ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#366732" />
                  <Text style={styles.loadingText}>Searching...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.searchResultItem}
                      onPress={() => selectResident(item)}
                    >
                      {item.profileImageUrl ? (
                        <Image 
                          source={{ uri: item.profileImageUrl }} 
                          style={styles.profileImage} 
                        />
                      ) : (
                        <View style={[styles.profileImage, styles.profilePlaceholder]}>
                          <Icon name="account" size={20} color="#fff" />
                        </View>
                      )}
                      
                      <View style={styles.residentInfo}>
                        <Text style={styles.residentName}>{item.name}</Text>
                        <Text style={styles.residentDetails}>
                          Apt: {item.apartmentId} • {item.phoneNumber}
                        </Text>
                        {item.occupancyStatus && (
                          <Text style={styles.occupancyStatus}>
                            {item.occupancyStatus}
                          </Text>
                        )}
                      </View>
                      
                      {item.phoneNumber && (
                        <TouchableOpacity 
                          style={styles.callButton}
                          onPress={() => handleCall(item.phoneNumber)}
                        >
                          <Icon name="phone" size={20} color="#366732" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  )}
                  style={styles.resultsList}
                  nestedScrollEnabled={true}
                />
              ) : (
                <Text style={styles.noResultsText}>
                  No residents found matching "{searchQuery}"
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Visitor Information */}
        <View style={styles.section}>
          <Text style={styles.label}>Visitor Name*</Text>
          <TextInput
            style={styles.input}
            value={visitorName}
            onChangeText={setVisitorName}
            placeholder="Enter visitor's full name"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Visitor Phone*</Text>
          <TextInput
            style={styles.input}
            value={visitorPhone}
            onChangeText={setVisitorPhone}
            placeholder="Enter visitor's phone number"
            keyboardType="phone-pad"
          />
        </View>

        {/* Visit Details */}
        <View style={styles.section}>
          <Text style={styles.label}>Purpose of Visit*</Text>
          <TextInput
            style={styles.input}
            value={purpose}
            onChangeText={setPurpose}
            placeholder="e.g. Delivery, Guest Visit, Service"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Vehicle Number (if any)</Text>
          <TextInput
            style={styles.input}
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            placeholder="Enter vehicle registration number"
          />
        </View>

        {/* Date/Time Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Visit Time*</Text>
          
          <View style={styles.timeRow}>
            <View style={styles.timeInputContainer}>
              <Text style={styles.timeLabel}>From:</Text>
              <TouchableOpacity 
                style={styles.timeInput}
                onPress={() => setShowFromPicker(true)}
              >
                <Text style={styles.timeText}>{fromDate.toLocaleString()}</Text>
                <Icon name="calendar-clock" size={20} color="#666"/>
              </TouchableOpacity>
            </View>
            
            <View style={styles.timeInputContainer}>
              <Text style={styles.timeLabel}>To:</Text>
              <TouchableOpacity 
                style={styles.timeInput}
                onPress={() => setShowToPicker(true)}
              >
                <Text style={styles.timeText}>{toDate.toLocaleString()}</Text>
                <Icon name="calendar-clock" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Additional Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Additional Notes</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special instructions"
            multiline
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Gate Pass Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Date/Time Pickers */}
      {showFromPicker && (
        <DateTimePicker
          value={fromDate}
          mode="datetime"
          display="default"
          onChange={handleFromDateChange}
          minimumDate={new Date()}
        />
      )}
      
      {showToPicker && (
        <DateTimePicker
          value={toDate}
          mode="datetime"
          display="default"
          onChange={handleToDateChange}
          minimumDate={fromDate}
        />
      )}
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
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerPlaceholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
  },
  searchContainer: {
    position: 'relative',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    paddingRight: 40,
    fontSize: 16,
    height:65
  },
  searchIcon: {
    position: 'absolute',
    right: 12,
    top: 22,
  },
  selectedResidentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f8f0',
    borderRadius: 6,
    borderColor: '#366732',
    borderWidth: 1,
  },
  selectedResidentText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#366732',
    fontWeight: '500',
  },
  searchResultsContainer: {
    marginTop: 10,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  resultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  profilePlaceholder: {
    backgroundColor: '#366732',
    justifyContent: 'center',
    alignItems: 'center',
  },
  residentInfo: {
    flex: 1,
  },
  residentName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  residentDetails: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  occupancyStatus: {
    color: '#366732',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  callButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f8f0',
  },
  noResultsText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
    fontStyle: 'italic',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInputContainer: {
    width: '48%',
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',  
  },
  timeText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#366732',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NewGatePassRequestScreen;