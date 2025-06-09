import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Platform,
  Modal,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

const VisitorsLogScreen = ({ navigation }) => {
  const communityData = useSelector((state) => state?.user?.communityData);

  const [visitorsLog, setVisitorsLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredVisitors, setFilteredVisitors] = useState([]);
  
  // Filter states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'thisWeek', 'lastWeek', 'lastMonth', 'custom'
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const filterOptions = [
    { key: 'all', label: 'All Time', icon: 'calendar' },
    { key: 'thisWeek', label: 'This Week', icon: 'calendar-week' },
    { key: 'lastWeek', label: 'Last Week', icon: 'calendar-week-begin' },
    { key: 'lastMonth', label: 'Last Month', icon: 'calendar-month' },
    { key: 'custom', label: 'Custom Range', icon: 'calendar-range' },
  ];

  useEffect(() => {
    if (!communityData?.id) return;

    const communityRef = firestore().collection('communities').doc(communityData.id);
    
    const unsubscribe = communityRef
      .collection('visitors')
      .orderBy('entryTime', 'desc')
      .onSnapshot(snapshot => {
        const visitors = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVisitorsLog(visitors);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [communityData?.id]);

  // Helper functions for date filtering
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getEndOfWeek = (date) => {
    const startOfWeek = getStartOfWeek(date);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
  };

  const getStartOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getEndOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  };

  const filterByDateRange = (visitors, startDate, endDate) => {
    return visitors.filter(visitor => {
      if (!visitor.entryTime) return false;
      const entryDate = visitor.entryTime.toDate();
      return entryDate >= startDate && entryDate <= endDate;
    });
  };

  const getFilteredByTime = (visitors) => {
    const now = new Date();
    
    switch (selectedFilter) {
      case 'thisWeek':
        const thisWeekStart = getStartOfWeek(now);
        const thisWeekEnd = getEndOfWeek(now);
        return filterByDateRange(visitors, thisWeekStart, thisWeekEnd);
        
      case 'lastWeek':
        const lastWeekStart = getStartOfWeek(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        const lastWeekEnd = getEndOfWeek(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        return filterByDateRange(visitors, lastWeekStart, lastWeekEnd);
        
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthStart = getStartOfMonth(lastMonth);
        const lastMonthEnd = getEndOfMonth(lastMonth);
        return filterByDateRange(visitors, lastMonthStart, lastMonthEnd);
        
      case 'custom':
        const customStart = new Date(customStartDate);
        customStart.setHours(0, 0, 0, 0);
        const customEnd = new Date(customEndDate);
        customEnd.setHours(23, 59, 59, 999);
        return filterByDateRange(visitors, customStart, customEnd);
        
      default:
        return visitors;
    }
  };

  useEffect(() => {
    let timeFiltered = getFilteredByTime(visitorsLog);
    
    if (searchQuery.trim().length === 0) {
      setFilteredVisitors(timeFiltered);
    } else {
      const searchFiltered = timeFiltered.filter((item) =>
        item.visitorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.visitorPhone?.includes(searchQuery.trim()) ||
        item.apartmentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.hostName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pinCode?.toString().includes(searchQuery.trim())
      );
      setFilteredVisitors(searchFiltered);
    }
  }, [searchQuery, visitorsLog, selectedFilter, customStartDate, customEndDate]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'checked-in': return '#4CAF50';
      case 'checked-out': return '#2196F3';
      case 'rejected': return '#F44336';
      case 'expired': return '#FF9800';
      default: return '#757575';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'checked-in': return 'CHECKED IN';
      case 'checked-out': return 'CHECKED OUT';
      case 'rejected': return 'REJECTED';
      case 'expired': return 'EXPIRED';
      default: return status?.toUpperCase() || 'UNKNOWN';
    }
  };

  const getFilterLabel = () => {
    const option = filterOptions.find(opt => opt.key === selectedFilter);
    if (selectedFilter === 'custom') {
      return `${customStartDate.toLocaleDateString()} - ${customEndDate.toLocaleDateString()}`;
    }
    return option?.label || 'All Time';
  };

  const handleFilterSelect = (filterKey) => {
    setSelectedFilter(filterKey);
    if (filterKey !== 'custom') {
      setFilterModalVisible(false);
    }
  };

  const handleCustomDateConfirm = () => {
    setFilterModalVisible(false);
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setCustomStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setCustomEndDate(selectedDate);
    }
  };

  const renderVisitorItem = ({ item }) => {
    return (
      <TouchableOpacity style={styles.visitorCard}>
        <View style={styles.visitorHeader}>
          <Text style={styles.visitorName}>{item.visitorName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        
        <View style={styles.visitorDetails}>
          <Text style={styles.visitorInfo}>
            <Icon name="phone" size={14} color="#666" /> {item.visitorPhone}
          </Text>
          <Text style={styles.visitorInfo}>
            <Icon name="home" size={14} color="#666" /> Apartment: {item.apartmentId}
          </Text>
          <Text style={styles.visitorInfo}>
            <Icon name="account" size={14} color="#666" /> Host: {item.hostName}
          </Text>
          {item.pinCode && (
            <Text style={styles.visitorInfo}>
              <Icon name="lock" size={14} color="#666" /> PIN: {item.pinCode}
            </Text>
          )}
          {item.purpose && (
            <Text style={styles.visitorInfo}>
              <Icon name="information" size={14} color="#666" /> Purpose: {item.purpose}
            </Text>
          )}
          {item.vehicleNumber && (
            <Text style={styles.visitorInfo}>
              <Icon name="car" size={14} color="#666" /> Vehicle: {item.vehicleNumber}
            </Text>
          )}
          <Text style={styles.visitorInfo}>
            <Icon name="clock" size={14} color="#666" /> Entry: {new Date(item.entryTime?.toDate()).toLocaleString()}
          </Text>
          {item.exitTime && (
            <Text style={styles.visitorInfo}>
              <Icon name="clock-outline" size={14} color="#666" /> Exit: {new Date(item.exitTime?.toDate()).toLocaleString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visitors Log</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#366732" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visitors Log</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone, apartment, or host"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Icon name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Button */}
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Icon name="filter" size={18} color="#366732" />
          <Text style={styles.filterButtonText}>{getFilterLabel()}</Text>
          <Icon name="chevron-down" size={18} color="#366732" />
        </TouchableOpacity>

        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {filteredVisitors.length} visitor{filteredVisitors.length !== 1 ? 's' : ''} found
        </Text>

        {/* Visitors List */}
        <FlatList
          data={filteredVisitors}
          renderItem={renderVisitorItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="account-group" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No visitors found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery || selectedFilter !== 'all' 
                  ? 'Try adjusting your search terms or filters' 
                  : 'No visitors have been logged yet'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Visitors</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    selectedFilter === option.key && styles.selectedFilterOption
                  ]}
                  onPress={() => handleFilterSelect(option.key)}
                >
                  <Icon 
                    name={option.icon} 
                    size={20} 
                    color={selectedFilter === option.key ? '#366732' : '#666'} 
                  />
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilter === option.key && styles.selectedFilterOptionText
                  ]}>
                    {option.label}
                  </Text>
                  {selectedFilter === option.key && (
                    <Icon name="check" size={20} color="#366732" />
                  )}
                </TouchableOpacity>
              ))}

              {/* Custom Date Range Section */}
              {selectedFilter === 'custom' && (
                <View style={styles.customDateSection}>
                  <Text style={styles.customDateTitle}>Select Date Range</Text>
                  
                  <View style={styles.datePickerRow}>
                    <Text style={styles.dateLabel}>From:</Text>
                    <TouchableOpacity 
                      style={styles.datePickerButton}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Text style={styles.datePickerText}>
                        {customStartDate.toLocaleDateString()}
                      </Text>
                      <Icon name="calendar" size={18} color="#366732" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.datePickerRow}>
                    <Text style={styles.dateLabel}>To:</Text>
                    <TouchableOpacity 
                      style={styles.datePickerButton}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Text style={styles.datePickerText}>
                        {customEndDate.toLocaleDateString()}
                      </Text>
                      <Icon name="calendar" size={18} color="#366732" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={styles.applyButton}
                    onPress={handleCustomDateConfirm}
                  >
                    <Text style={styles.applyButtonText}>Apply Filter</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={customStartDate}
          mode="date"
          display="default"
          onChange={onStartDateChange}
          maximumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={customEndDate}
          mode="date"
          display="default"
          onChange={onEndDateChange}
          maximumDate={new Date()}
          minimumDate={customStartDate}
        />
      )}
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
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
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
    padding: 16,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 45,
    color: '#333',
    fontSize: 16,
  },
  clearSearchButton: {
    marginLeft: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 2,
  },
  filterButtonText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 20,
  },
  visitorCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  visitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  visitorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  visitorDetails: {
    gap: 6,
  },
  visitorInfo: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 20,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  selectedFilterOption: {
    backgroundColor: '#f0f8f0',
  },
  filterOptionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  selectedFilterOptionText: {
    color: '#366732',
    fontWeight: '600',
  },
  customDateSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  customDateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 16,
    color: '#666',
    width: 50,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginLeft: 12,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  applyButton: {
    backgroundColor: '#366732',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom:20
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VisitorsLogScreen;