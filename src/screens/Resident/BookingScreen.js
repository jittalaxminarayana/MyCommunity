import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parse, addDays, isBefore, isAfter, addMinutes } from 'date-fns';

const BookingScreen = ({ route, navigation }) => {
  const { facility } = route.params;
  const userData = useSelector((state) => state?.user?.userData);
  const communityData = useSelector((state) => state?.user?.communityData);

  // State variables
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(new Date().getTime() + 60 * 60 * 1000));
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [participants, setParticipants] = useState(1);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [notes, setNotes] = useState('');
  const [availabilityDocId, setAvailabilityDocId] = useState(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringBooking, setRecurringBooking] = useState({
    isRecurring: false,
    frequency: null,
    endDate: null
  });

  // Parse facility opening hours
  const parseOpeningHours = () => {
    if (!facility?.openingHours) return { openHour: 7, closeHour: 21 };
    
    try {
      const [openStr, closeStr] = facility?.openingHours.split(' - ');
      const openHour = parseInt(openStr.split(':')[0]);
      const closeHour = parseInt(closeStr.split(':')[0]);
      return { openHour, closeHour };
    } catch (e) {
      return { openHour: 7, closeHour: 21 };
    }
  };

  useEffect(() => {
    if (facility?.id && communityData?.id) {
      fetchAvailableSlots();
    }
  }, [facility, communityData, date]);

  const fetchAvailableSlots = async () => {
    if (!facility?.id || !communityData?.id) return;

    setLoading(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      const availabilityRef = firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('facilityAvailability')
        .where('facilityId', '==', facility.id)
        .where('date', '==', formattedDate);
      
      const snapshot = await availabilityRef.get();
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setAvailabilityDocId(doc.id);
        setAvailableSlots(doc.data().slots || []);
      } else {
        // Generate default slots based on opening hours
        const { openHour, closeHour } = parseOpeningHours();
        const defaultSlots = generateDefaultSlots(openHour, closeHour);
        setAvailableSlots(defaultSlots);
        
        // Create new availability document
        const docRef = await firestore()
          .collection('communities')
          .doc(communityData.id)
          .collection('facilityAvailability')
          .add({
            facilityId: facility.id,
            date: formattedDate,
            slots: defaultSlots,
            createdAt: firestore.FieldValue.serverTimestamp()
          });
        
        setAvailabilityDocId(docRef.id);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      Alert.alert('Error', 'Could not load availability data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultSlots = (openHour, closeHour) => {
    const slots = [];
    const slotDuration = 60; // minutes
    
    for (let hour = openHour; hour < closeHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const startHour = hour < 10 ? `0${hour}` : hour;
        const startMinute = minute < 10 ? `0${minute}` : minute;
        const endTime = addMinutes(new Date(0, 0, 0, hour, minute), slotDuration);
        
        slots.push({
          startTime: `${startHour}:${startMinute}`,
          endTime: format(endTime, 'HH:mm'),
          available: true,
          bookingId: null
        });
      }
    }
    
    return slots;
  };

  const checkSlotAvailability = (start, end) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const formattedStart = format(start, 'HH:mm');
    const formattedEnd = format(end, 'HH:mm');

    // Check if within facility hours
    const { openHour, closeHour } = parseOpeningHours();
    const facilityOpen = new Date(date);
    facilityOpen.setHours(openHour, 0, 0);
    const facilityClose = new Date(date);
    facilityClose.setHours(closeHour, 0, 0);

    if (isBefore(start, facilityOpen) || isAfter(end, facilityClose)) {
      return { available: false, message: `Facility is only open from ${openHour}:00 to ${closeHour}:00` };
    }

    // Check against available slots
    const selectedSlot = availableSlots.find(slot => 
      slot.startTime === formattedStart && slot.endTime === formattedEnd
    );

    if (!selectedSlot || !selectedSlot.available) {
      return { available: false, message: 'This time slot is not available' };
    }

    return { available: true };
  };

  const handleBooking = async () => {
    if (!userData?.uid || !communityData?.id || !facility?.id) {
      Alert.alert('Error', 'Missing required information. Please try again later.');
      return;
    }

    // Validate participants
    const maxCapacity = parseInt(facility?.capacity || '20');
    if (participants < 1 || participants > maxCapacity) {
      Alert.alert('Error', `Number of participants must be between 1 and ${maxCapacity}`);
      return;
    }

    // Validate time
    if (endTime <= startTime) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    // Check slot availability
    const availability = checkSlotAvailability(startTime, endTime);
    if (!availability.available) {
      Alert.alert('Error', availability.message);
      return;
    }

    setSubmitting(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const formattedStartTime = format(startTime, 'HH:mm');
      const formattedEndTime = format(endTime, 'HH:mm');

      // Check for overlapping bookings
      const overlappingQuery = await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('bookings')
        .where('facilityId', '==', facility.id)
        .where('date', '==', formattedDate)
        .where('status', 'in', ['confirmed', 'pending'])
        .get();

      const hasOverlap = overlappingQuery.docs.some(doc => {
        const booking = doc.data();
        return (
          (formattedStartTime >= booking.startTime && formattedStartTime < booking.endTime) ||
          (formattedEndTime > booking.startTime && formattedEndTime <= booking.endTime) ||
          (formattedStartTime <= booking.startTime && formattedEndTime >= booking.endTime)
        );
      });

      if (hasOverlap) {
        Alert.alert('Error', 'This time slot conflicts with an existing booking');
        return;
      }

      // Create booking
      const bookingRef = firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('bookings')
        .doc();

      const bookingData = {
        id: bookingRef.id,
        facilityId: facility.id,
        facilityName: facility.name,
        userId: userData.uid,
        userName: userData.displayName || 'Resident',
        userUnit: userData.unit || 'Unknown',
        date: formattedDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        status: 'confirmed',
        participants: participants,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        notes: notes,
        paymentStatus: facility?.fee === 'Free for residents' ? 'free' : 'pending',
        paymentAmount: facility?.fee && facility?.fee !== 'Free for residents' ? 
          parseFloat(facility?.fee.replace(/[^0-9.]/g, '')) : 0,
        recurring: recurringBooking
      };

      // Create booking document
      await bookingRef.set(bookingData);

      // Add to user's bookings subcollection
      await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('users')
        .doc(userData.uid)
        .collection('bookings')
        .add({
          bookingId: bookingRef.id,
          facilityId: facility.id,
          facilityName: facility.name,
          date: formattedDate,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
          status: 'confirmed',
          createdAt: firestore.FieldValue.serverTimestamp()
        });

      // Update availability
      const updatedSlots = availableSlots.map(slot => {
        if (slot.startTime === formattedStartTime && slot.endTime === formattedEndTime) {
          return { ...slot, available: false, bookingId: bookingRef.id };
        }
        return slot;
      });

      await firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('facilityAvailability')
        .doc(availabilityDocId)
        .update({ slots: updatedSlots });

      setAvailableSlots(updatedSlots);

      // Handle recurring bookings if enabled
      if (recurringBooking.isRecurring && recurringBooking.frequency && recurringBooking.endDate) {
        await createRecurringBookings(bookingData, formattedStartTime, formattedEndTime);
      }

      // Show success message
      Alert.alert(
        'Booking Confirmed',
        `Your booking for ${facility.name} on ${formattedDate} from ${formattedStartTime} to ${formattedEndTime} has been confirmed.`,
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('ResidentDashboard') 
          }
        ]
      );

    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const createRecurringBookings = async (originalBooking, startTimeStr, endTimeStr) => {
    try {
      const { frequency, endDate } = recurringBooking;
      let currentDate = new Date(date);
      const endDateObj = new Date(endDate);
      
      while (true) {
        // Increment date based on frequency
        if (frequency === 'weekly') {
          currentDate = addDays(currentDate, 7);
        } else if (frequency === 'monthly') {
          currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
        }
        
        // Stop if we've passed the end date
        if (currentDate > endDateObj) break;
        
        const formattedDate = format(currentDate, 'yyyy-MM-dd');
        
        // Check availability for the recurring date
        const availabilityRef = firestore()
          .collection('communities')
          .doc(communityData.id)
          .collection('facilityAvailability')
          .where('facilityId', '==', facility.id)
          .where('date', '==', formattedDate);
        
        const snapshot = await availabilityRef.get();
        let availabilityId;
        let slots = [];
        
        if (snapshot.empty) {
          // Create new availability
          const { openHour, closeHour } = parseOpeningHours();
          slots = generateDefaultSlots(openHour, closeHour);
          const docRef = await firestore()
            .collection('communities')
            .doc(communityData.id)
            .collection('facilityAvailability')
            .add({
              facilityId: facility.id,
              date: formattedDate,
              slots: slots,
              createdAt: firestore.FieldValue.serverTimestamp()
            });
          availabilityId = docRef.id;
        } else {
          const doc = snapshot.docs[0];
          availabilityId = doc.id;
          slots = doc.data().slots || [];
        }
        
        // Find the slot
        const slotIndex = slots.findIndex(slot => 
          slot.startTime === startTimeStr && slot.endTime === endTimeStr
        );
        
        if (slotIndex !== -1 && slots[slotIndex].available) {
          // Create recurring booking
          const bookingRef = firestore()
            .collection('communities')
            .doc(communityData.id)
            .collection('bookings')
            .doc();
          
          const bookingData = {
            ...originalBooking,
            id: bookingRef.id,
            date: formattedDate,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
            isRecurringInstance: true,
            originalBookingId: originalBooking.id
          };
          
          await bookingRef.set(bookingData);
          
          // Update availability
          slots[slotIndex] = {
            ...slots[slotIndex],
            available: false,
            bookingId: bookingRef.id
          };
          
          await firestore()
            .collection('communities')
            .doc(communityData.id)
            .collection('facilityAvailability')
            .doc(availabilityId)
            .update({ slots: slots });
        }
      }
    } catch (error) {
      console.error('Error creating recurring bookings:', error);
    }
  };

  // Date and time picker handlers
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      // Reset times when date changes
      const newStartTime = new Date(selectedDate);
      newStartTime.setHours(9, 0, 0);
      setStartTime(newStartTime);
      
      const newEndTime = new Date(newStartTime);
      newEndTime.setHours(newStartTime.getHours() + 1);
      setEndTime(newEndTime);
    }
  };

  const onStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      setStartTime(selectedTime);
      
      // Adjust end time if needed
      if (selectedTime >= endTime) {
        const newEndTime = new Date(selectedTime);
        newEndTime.setHours(newEndTime.getHours() + 1);
        setEndTime(newEndTime);
      }
    }
  };

  const onEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      // Ensure end time is after start time
      if (selectedTime <= startTime) {
        Alert.alert('Error', 'End time must be after start time');
        return;
      }
      setEndTime(selectedTime);
    }
  };

  const renderRecurringModal = () => (
    <Modal
      visible={showRecurringModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowRecurringModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Recurring Booking</Text>
          
          <TouchableOpacity
            style={[
              styles.recurringOption,
              recurringBooking.frequency === 'weekly' && styles.selectedOption
            ]}
            onPress={() => setRecurringBooking({
              ...recurringBooking,
              frequency: 'weekly'
            })}
          >
            <Text>Weekly</Text>
            {recurringBooking.frequency === 'weekly' && (
              <Icon name="check" size={20} color="#366732" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.recurringOption,
              recurringBooking.frequency === 'monthly' && styles.selectedOption
            ]}
            onPress={() => setRecurringBooking({
              ...recurringBooking,
              frequency: 'monthly'
            })}
          >
            <Text>Monthly</Text>
            {recurringBooking.frequency === 'monthly' && (
              <Icon name="check" size={20} color="#366732" />
            )}
          </TouchableOpacity>
          
          {recurringBooking.frequency && (
            <View style={styles.datePickerContainer}>
              <Text style={styles.modalLabel}>End Date:</Text>
              <DateTimePicker
                value={recurringBooking.endDate || addDays(date, 7)}
                mode="date"
                display="default"
                minimumDate={addDays(date, 1)}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setRecurringBooking({
                      ...recurringBooking,
                      endDate: selectedDate
                    });
                  }
                }}
              />
            </View>
          )}
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setRecurringBooking({
                  isRecurring: false,
                  frequency: null,
                  endDate: null
                });
                setShowRecurringModal(false);
              }}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => {
                setRecurringBooking({
                  ...recurringBooking,
                  isRecurring: !!recurringBooking.frequency
                });
                setShowRecurringModal(false);
              }}
            >
              <Text style={styles.modalButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book {facility?.name}</Text>
      </View>
      <ScrollView> 
      <View style={styles.facilityInfoCard}>
        <View style={styles.facilityIconContainer}>
          <Icon name={facility?.icon || 'calendar-blank'} size={32} color="#366732" />
        </View>
        <View style={styles.facilityDetails}>
          <Text style={styles.facilityName}>{facility?.name}</Text>
          <Text style={styles.facilityInfo}>
            <Icon name="clock-outline" size={14} color="#666" /> {facility?.openingHours || 'Not specified'}
          </Text>
          <Text style={styles.facilityInfo}>
            <Icon name="account-group" size={14} color="#666" /> Capacity: {facility?.capacity || 'Not specified'}
          </Text>
          <Text style={styles.facilityInfo}>
            <Icon name="cash" size={14} color="#666" /> {facility?.fee || 'Free for residents'}
          </Text>
        </View>
      </View>

      <View style={styles.bookingSection}>
        <Text style={styles.sectionTitle}>Booking Details</Text>

        {/* Date Selection */}
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Date:</Text>
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)} 
            style={styles.datePicker}
          >
            <Text style={styles.dateText}>{format(date, 'MMM dd, yyyy')}</Text>
            <Icon name="calendar" size={20} color="#366732" />
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Time Selection */}
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Start Time:</Text>
          <TouchableOpacity 
            onPress={() => setShowStartTimePicker(true)} 
            style={styles.datePicker}
          >
            <Text style={styles.dateText}>{format(startTime, 'h:mm a')}</Text>
            <Icon name="clock-outline" size={20} color="#366732" />
          </TouchableOpacity>
        </View>
        {showStartTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            display="default"
            onChange={onStartTimeChange}
            minuteInterval={15}
          />
        )}

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>End Time:</Text>
          <TouchableOpacity 
            onPress={() => setShowEndTimePicker(true)} 
            style={styles.datePicker}
          >
            <Text style={styles.dateText}>{format(endTime, 'h:mm a')}</Text>
            <Icon name="clock-outline" size={20} color="#366732" />
          </TouchableOpacity>
        </View>
        {showEndTimePicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            display="default"
            onChange={onEndTimeChange}
            minuteInterval={15}
          />
        )}

        {/* Participants */}
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Participants:</Text>
          <View style={styles.counterContainer}>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setParticipants(Math.max(1, participants - 1))}
            >
              <Icon name="minus" size={20} color="#366732" />
            </TouchableOpacity>
            <Text style={styles.counterText}>{participants}</Text>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => {
                const maxCapacity = parseInt(facility?.capacity || '20');
                setParticipants(Math.min(maxCapacity, participants + 1));
              }}
            >
              <Icon name="plus" size={20} color="#366732" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Notes:</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Any special requests?"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Recurring Booking Option */}
        <TouchableOpacity
          style={styles.recurringButton}
          onPress={() => setShowRecurringModal(true)}
        >
          <Icon 
            name={recurringBooking.isRecurring ? "repeat" : "repeat-off"} 
            size={20} 
            color={recurringBooking.isRecurring ? "#366732" : "#666"} 
          />
          <Text style={[
            styles.recurringButtonText,
            recurringBooking.isRecurring && styles.recurringButtonTextActive
          ]}>
            {recurringBooking.isRecurring 
              ? `Recurring (${recurringBooking.frequency}) until ${format(recurringBooking.endDate, 'MMM dd')}`
              : 'Make this a recurring booking'}
          </Text>
        </TouchableOpacity>

        {/* Rules Section */}
        {facility?.rules && facility?.rules.length > 0 && (
          <View style={styles.rulesSection}>
            <Text style={styles.rulesTitle}>Facility Rules</Text>
            {facility?.rules.map((rule, index) => (
              <View key={index} style={styles.ruleItem}>
                <Icon name="check-circle" size={18} color="#366732" style={styles.ruleIcon} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Availability Section */}
      <View style={styles.availabilitySection}>
        <Text style={styles.sectionTitle}>Available Time Slots</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#366732" />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.slotsContainer}>
              {availableSlots.length === 0 ? (
                <Text style={styles.noSlotsText}>No available slots for this date.</Text>
              ) : (
                availableSlots.map((slot, index) => {
                  const isSelected = format(startTime, 'HH:mm') === slot.startTime && 
                                   format(endTime, 'HH:mm') === slot.endTime;
                  return (
                    <TouchableOpacity 
                      key={index}
                      style={[
                        styles.slotItem,
                        !slot.available && styles.unavailableSlot,
                        isSelected && styles.selectedSlot
                      ]}
                      disabled={!slot.available}
                      onPress={() => {
                        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
                        const [endHour, endMinute] = slot.endTime.split(':').map(Number);
                        
                        const newStartTime = new Date(date);
                        newStartTime.setHours(startHour, startMinute, 0);
                        
                        const newEndTime = new Date(date);
                        newEndTime.setHours(endHour, endMinute, 0);
                        
                        setStartTime(newStartTime);
                        setEndTime(newEndTime);
                      }}
                    >
                      <Text style={[
                        styles.slotTimeText, 
                        !slot.available && styles.unavailableText,
                        isSelected && styles.selectedText
                      ]}>
                        {slot.startTime} - {slot.endTime}
                      </Text>
                      {!slot.available ? (
                        <Text style={styles.bookedText}>Booked</Text>
                      ) : isSelected ? (
                        <Icon name="check-circle" size={16} color="#fff" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Booking Button */}
      <TouchableOpacity 
        style={styles.bookingButton}
        onPress={handleBooking}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.bookingButtonText}>
            {facility?.fee === 'Free for residents' 
              ? 'Confirm Booking' 
              : `Pay ${facility?.fee || '$0'} & Confirm`}
          </Text>
        )}
      </TouchableOpacity>

      {/* Recurring Booking Modal */}
      {renderRecurringModal()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#366732',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    paddingTop:30
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  facilityInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    elevation: 2,
  },
  facilityIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  facilityDetails: {
    flex: 1,
  },
  facilityName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  facilityInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    width: '30%',
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: '65%',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 4,
    width: '65%',
    justifyContent: 'space-between',
  },
  counterButton: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  notesInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    width: '65%',
    textAlignVertical: 'top',
  },
  recurringButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
  },
  recurringButtonText: {
    marginLeft: 10,
    color: '#666',
  },
  recurringButtonTextActive: {
    color: '#366732',
    fontWeight: '500',
  },
  rulesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  rulesTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleIcon: {
    marginRight: 8,
  },
  ruleText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  availabilitySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    elevation: 2,
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slotItem: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  unavailableSlot: {
    backgroundColor: '#ffebee',
  },
  selectedSlot: {
    backgroundColor: '#366732',
  },
  slotTimeText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  unavailableText: {
    color: '#999',
  },
  selectedText: {
    color: '#fff',
  },
  bookedText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
  },
  noSlotsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    width: '100%',
  },
  bookingButton: {
    backgroundColor: '#366732',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  bookingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  recurringOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedOption: {
    borderColor: '#366732',
    backgroundColor: '#e8f5e9',
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  datePickerContainer: {
    marginTop: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    padding: 10,
    borderRadius: 6,
    width: '48%',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#366732',
  },
  modalButtonText: {
    color: '#333',
    fontWeight: '500',
  },
});

export default BookingScreen;