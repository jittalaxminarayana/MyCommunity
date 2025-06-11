import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
    ActivityIndicator,
    Modal,
    Alert,
} from 'react-native';
import { firebase } from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';
import { format } from 'date-fns';
import RNFS from 'react-native-fs';
import Share from 'react-native-share'; 

const GatePassHistoryScreen = ({ navigation }) => {
    const userData = useSelector((state) => state?.user?.userData);
    const communityData = useSelector((state) => state?.user?.communityData);


    const [activeTab, setActiveTab] = useState('requests');
    const [myPasses, setMyPasses] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loadingPasses, setLoadingPasses] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPass, setSelectedPass] = useState(null);
    const qrCodeRef = useRef();

    // Fetch user's passes
    useEffect(() => {
        // Add more comprehensive null checks
        if (!userData?.id || !communityData?.id) {
            console.log("Missing required data - userData:", userData, "communityData:", communityData);
            setLoadingPasses(false);
            return;
        }

        if (activeTab === 'my-passes') {
            console.log("Fetching passes for community:", communityData.id, "user:", userData.id);

            const unsubscribe = firebase.firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('gatePasses')
                .where('residentId', '==', userData.id)
                .orderBy('createdAt', 'desc')
                .onSnapshot(
                    (snapshot) => {
                        const passList = snapshot.docs.map(doc => {
                            const data = doc.data();
                            return {
                                id: doc.id,
                                ...data,
                                validFromFormatted: data.validFrom ? format(data.validFrom.toDate(), 'MMM dd, yyyy h:mm a') : 'Unknown',
                                validToFormatted: data.validTo ? format(data.validTo.toDate(), 'MMM dd, yyyy h:mm a') : 'Unknown'
                            };
                        });
                        setMyPasses(passList);
                        setLoadingPasses(false);
                    },
                    (error) => {
                        console.error("Error fetching passes:", error);
                        setLoadingPasses(false);
                    }
                );

            return () => unsubscribe();
        }
    }, [userData, communityData, activeTab]);

    // Fetch pending requests
    useEffect(() => {
        if (userData && communityData && activeTab === 'requests') {
            const unsubscribe = firebase.firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('gatePassRequests')
                .where('requestedByRole', '==', 'Security')
                .where('status', '==', 'pending')
                .where('residentId', '==', userData?.id)
                .orderBy('createdAt', 'desc')
                .onSnapshot(snapshot => {
                    const requestList = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            requestedAtFormatted: data.createdAt ? format(data.createdAt.toDate(), 'MMM dd, yyyy h:mm a') : 'Unknown',
                            validFromFormatted: data.validFrom ? format(data.validFrom.toDate(), 'MMM dd, yyyy h:mm a') : 'Unknown',
                            validToFormatted: data.validTo ? format(data.validTo.toDate(), 'MMM dd, yyyy h:mm a') : 'Unknown'
                        };
                    });
                    setRequests(requestList);
                    setLoadingRequests(false);
                });

            return () => unsubscribe();
        }
    }, [userData, communityData, activeTab]);

    const handleApproveRequest = async (requestId) => {
        try {
            // Update request status
            await firebase.firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('gatePassRequests')
                .doc(requestId)
                .update({ status: 'approved' });

            // Create the actual gate pass
            const request = requests.find(r => r.id === requestId);
            const pin = Math.floor(100000 + Math.random() * 900000).toString();

            await firebase.firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('gatePasses')
                .add({
                    ...request,
                    pin: pin,
                    status: 'used',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });

            Alert.alert('Success', 'Request approved and gate pass created.');
        } catch (error) {
            console.error('Error approving request:', error);
            Alert.alert('Error', 'Failed to approve request. Please try again.');
        }
    };

    const handleRejectRequest = async (requestId) => {
        try {
            await firebase.firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('gatePassRequests')
                .doc(requestId)
                .update({ status: 'rejected' });

            Alert.alert('Success', 'Request rejected.');
        } catch (error) {
            console.error('Error rejecting request:', error);
            Alert.alert('Error', 'Failed to reject request. Please try again.');
        }
    };

    const handleSharePass = async (pass) => {
        try {
          const message = `
      Gate Pass for ${communityData.name}
      -----------------------------------
      Visitor: ${pass.visitorName}
      PIN: ${pass.pin}
      Valid From: ${pass.validFromFormatted}
      Valid To: ${pass.validToFormatted}
      Purpose: ${pass.purpose}
      Apartment: ${pass.apartmentId}
      ${pass.vehicleNumber ? `Vehicle: ${pass.vehicleNumber}` : ''}
      ${pass.note ? `Note: ${pass.note}` : ''}
      
      Please show this pass and your ID at the gate for entry.
          `;
      
          // Convert QRCode to image
          qrCodeRef.current?.toDataURL(async (data) => {
            const path = `${RNFS.CachesDirectoryPath}/gate_pass_qr.png`;
            await RNFS.writeFile(path, data, 'base64');
      
            const shareOptions = {
              title: `Gate Pass for ${pass.visitorName}`,
              message: message,
              url: `file://${path}`,
              type: 'image/png',
            };
      
            await Share.open(shareOptions);
          });
      
        } catch (error) {
          console.error('Error sharing pass:', error);
          Alert.alert('Error', 'Failed to share gate pass.');
        }
      };
      
    const getPurposeIcon = (purpose) => {
        switch (purpose) {
            case 'guest':
                return 'account-multiple';
            case 'delivery':
                return 'package-variant';
            case 'staff':
                return 'account-hard-hat';
            case 'cab':
                return 'car';
            default:
                return 'ticket-confirmation';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return '#366732';
            case 'used':
                return '#f68422';
            case 'expired':
                return '#e74c3c';
            case 'pending':
                return '#e74c3c';
            default:
                return '#888';
        }
    };

    const renderPassCard = (pass) => (
        <TouchableOpacity
            key={pass.id}
            style={styles.passCard}
            onPress={() => {
                setSelectedPass(pass);
                setModalVisible(true);
            }}
        >
            <View style={styles.passHeader}>
                <View style={styles.purposeIconContainer}>
                    <Icon name={getPurposeIcon(pass.purpose)} size={24} color="#366732" />
                </View>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.passTitle}>{pass.visitorName}</Text>
                    <Text style={styles.passPhone}>{pass.visitorPhone}</Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: getStatusColor(pass.status) }]}>
                    <Text style={styles.statusText}>{pass.status}</Text>
                </View>
            </View>

            <View style={styles.passDetails}>

                <View style={styles.detailRow}>
                    <Icon name="clock-outline" size={16} color="#366732" />
                    <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Valid: </Text>
                        {pass.validFromFormatted} - {pass.validToFormatted}
                    </Text>
                </View>

                {pass.pin && (
                    <View style={styles.detailRow}>
                        <Icon name="information-outline" size={16} color="#366732" />
                        <Text style={styles.detailText}>
                            <Text style={styles.detailLabel}>Pin: </Text>
                            {pass.pin}
                        </Text>
                    </View>
                )}

                {pass.purpose && (
                    <View style={styles.detailRow}>
                        <Icon name="information-outline" size={16} color="#366732" />
                        <Text style={styles.detailText}>
                            <Text style={styles.detailLabel}>Purpose: </Text>
                            {pass.purpose}
                        </Text>
                    </View>
                )}
            
                {pass.vehicleNumber && (
                    <View style={styles.detailRow}>
                        <Icon name="car" size={16} color="#366732" />
                        <Text style={styles.detailText}>
                            <Text style={styles.detailLabel}>Vehicle: </Text>
                            {pass.vehicleNumber}
                        </Text>
                    </View>
                )}
            </View>

        
            {/* <View style={styles.passActions}>
            <View style={{ height: 0, width: 0, overflow: 'hidden' }}>
                    <QRCode
                        value={JSON.stringify({
                            passId: pass.id,
                            communityId: communityData.id,
                            visitorName: pass.visitorName,
                            pin: pass.pin
                        })}
                        size={200}
                        color="#366732"
                        getRef={(ref) => {
                            // Store the QR code reference for this specific pass
                            pass.qrRef = ref;
                        }}
                    />
                </View>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSharePass(pass)}
                >
                    <Icon name="share-variant" size={20} color="#366732" />
                    <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
            </View> */}
        </TouchableOpacity>
    );

    const renderRequestCard = (request) => (
        <View key={request.id} style={styles.requestCard}>
            <View style={styles.passHeader}>
                <View style={styles.purposeIconContainer}>
                    <Icon name={getPurposeIcon(request.purpose)} size={24} color="#366732" />
                </View>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.passTitle}>{request.visitorName}</Text>
                    <Text style={styles.passPhone}>{request.visitorPhone}</Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: getStatusColor('pending') }]}>
                    <Text style={styles.statusText}>Pending</Text>
                </View>
            </View>

            <View style={styles.passDetails}>
                <View style={styles.detailRow}>
                    <Icon name="clock-outline" size={16} color="#366732" />
                    <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Requested At: </Text>
                        {request.requestedAtFormatted}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Icon name="calendar" size={16} color="#366732" />
                    <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Visit Date: </Text>
                        {request.validFromFormatted}
                    </Text>
                </View>

                {request.purpose && (
                    <View style={styles.detailRow}>
                        <Icon name="information-outline" size={16} color="#366732" />
                        <Text style={styles.detailText}>
                            <Text style={styles.detailLabel}>Purpose: </Text>
                            {request.purpose}
                        </Text>
                    </View>
                )}

                {request.vehicleNumber && (
                    <View style={styles.detailRow}>
                        <Icon name="car" size={16} color="#366732" />
                        <Text style={styles.detailText}>
                            <Text style={styles.detailLabel}>Vehicle: </Text>
                            {request.vehicleNumber}
                        </Text>
                    </View>
                )}

                {request.note && (
                    <View style={styles.detailRow}>
                        <Icon name="note-text" size={16} color="#366732" />
                        <Text style={styles.detailText}>
                            <Text style={styles.detailLabel}>Security Note: </Text>
                            {request.note}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.requestActions}>
                
                <TouchableOpacity
                    style={[styles.requestButton, styles.approveButton]}
                    onPress={() => handleApproveRequest(request.id)}
                >
                    <Icon name="check" size={20} color="#fff" />
                    <Text style={styles.requestButtonText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.requestButton, styles.rejectButton]}
                    onPress={() => handleRejectRequest(request.id)}
                >
                    <Icon name="close" size={20} color="#fff" />
                    <Text style={styles.requestButtonText}>Reject</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderPassDetailsModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
                setModalVisible(false);
            }}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Gate Pass Details</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Icon name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {selectedPass && (
                        <ScrollView style={styles.modalBody}>
                            <View style={styles.qrContainer}>
                                <QRCode
                                    value={JSON.stringify({
                                        passId: selectedPass.id,
                                        communityId: communityData.id,
                                        visitorName: selectedPass.visitorName,
                                        pin: selectedPass.pin
                                    })}
                                    size={200}
                                    color="#366732"
                                    getRef={qrCodeRef}
                                />
                            </View>

                            <View style={styles.pinContainer}>
                                <Text style={styles.pinLabel}>PIN</Text>
                                <Text style={styles.pinValue}>{selectedPass.pin}</Text>
                            </View>

                            <View style={styles.visitorDetails}>
                                <Text style={styles.detailSectionTitle}>Visitor Details</Text>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailItemLabel}>Name:</Text>
                                    <Text style={styles.detailItemValue}>{selectedPass.visitorName}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailItemLabel}>Phone:</Text>
                                    <Text style={styles.detailItemValue}>{selectedPass.visitorPhone}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailItemLabel}>Purpose:</Text>
                                    <Text style={styles.detailItemValue}>{selectedPass.purpose}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailItemLabel}>Status:</Text>
                                    <Text style={[styles.detailItemValue, { color: getStatusColor(selectedPass.status) }]}>
                                        {selectedPass.status}
                                    </Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailItemLabel}>Valid From:</Text>
                                    <Text style={styles.detailItemValue}>{selectedPass.validFromFormatted}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailItemLabel}>Valid To:</Text>
                                    <Text style={styles.detailItemValue}>{selectedPass.validToFormatted}</Text>
                                </View>
                                {selectedPass.vehicleNumber && (
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailItemLabel}>Vehicle Number:</Text>
                                        <Text style={styles.detailItemValue}>{selectedPass.vehicleNumber}</Text>
                                    </View>
                                )}
                                {selectedPass.note && (
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailItemLabel}>Note:</Text>
                                        <Text style={styles.detailItemValue}>{selectedPass.note}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalActionButton}
                                    onPress={() => handleSharePass(selectedPass)}
                                >
                                    <Icon name="share-variant" size={20} color="#fff" />
                                    <Text style={styles.modalActionText}>Share Pass</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );

    const renderContent = () => {
        if (activeTab === 'my-passes') {
            if (loadingPasses) {
                return (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#366732" />
                        <Text style={styles.loadingText}>Loading passes...</Text>
                    </View>
                );
            }

            if (myPasses.length === 0) {
                return (
                    <View style={styles.emptyState}>
                        <Icon name="ticket-confirmation-outline" size={80} color="#366732" />
                        <Text style={styles.emptyText}>No gate passes found</Text>
                        <Text style={styles.emptySubtext}>Create a gate pass for your visitors</Text>
                    </View>
                );
            }

            return (
                <FlatList
                    data={myPasses}
                    renderItem={({ item }) => renderPassCard(item)}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.passList}
                    showsVerticalScrollIndicator={false}
                />
            );
        } else {
            if (loadingRequests) {
                return (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#366732" />
                        <Text style={styles.loadingText}>Loading requests...</Text>
                    </View>
                );
            }

            if (requests.length === 0) {
                return (
                    <View style={styles.emptyState}>
                        <Icon name="bell-outline" size={80} color="#366732" />
                        <Text style={styles.emptyText}>No pending requests</Text>
                        <Text style={styles.emptySubtext}>You don't have any gate pass requests</Text>
                    </View>
                );
            }

            return (
                <FlatList
                    data={requests}
                    renderItem={({ item }) => renderRequestCard(item)}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.passList}
                    showsVerticalScrollIndicator={false}
                />
            );
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
                <Text style={styles.headerTitle}>Gate Pass History</Text>
                <View style={styles.headerRightSpace}></View>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'requests' && styles.activeTab]}
                    onPress={() => setActiveTab('requests')}
                >
                    <Icon name="bell" size={20} color={activeTab === 'requests' ? '#366732' : '#666'} />
                    <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Requests</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'my-passes' && styles.activeTab]}
                    onPress={() => setActiveTab('my-passes')}
                >
                    <Icon name="ticket-confirmation" size={20} color={activeTab === 'my-passes' ? '#366732' : '#666'} />
                    <Text style={[styles.tabText, activeTab === 'my-passes' && styles.activeTabText]}>My Passes</Text>
                </TouchableOpacity>
            </View>

            {renderContent()}

            {renderPassDetailsModal()}
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
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 2,
        marginBottom:10
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    activeTab: {
        backgroundColor: '#f0f8ef',
        borderBottomWidth: 2,
        borderBottomColor: '#366732',
    },
    tabText: {
        fontSize: 14,
        color: '#666',
    },
    activeTabText: {
        color: '#366732',
        fontWeight: 'bold',
    },
    myPassesContainer: {
        flex: 1,
        padding: 16,
    },
    passList: {
        paddingBottom: 20,
    },
    passCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 2,
    },
    requestCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 2,
    },
    passHeader: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    purposeIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff8f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    passTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    passPhone: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    statusTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
        backgroundColor: '#366732',
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
    },
    passDetails: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#444',
        flex: 1,
    },
    detailLabel: {
        fontWeight: 'bold',
        color: '#333',
    },
    passActions: {
        flexDirection: 'row',
        padding: 12,
        justifyContent: 'flex-end',
    },
    requestActions: {
        flexDirection: 'row',
        padding: 12,
        justifyContent: 'space-between',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 6,
    },
    requestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        gap: 8,
        flex: 1,
        justifyContent: 'center',
        marginHorizontal: 5,
    },
    approveButton: {
        backgroundColor: '#366732',
    },
    rejectButton: {
        backgroundColor: '#e74c3c',
    },
    requestButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    actionText: {
        fontSize: 14,
        color: '#366732',
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#366732',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 18,
        color: '#366732',
        marginTop: 16,
        fontWeight: 'bold',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        width: '95%',
        maxHeight: '100%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalBody: {
        padding: 16,
    },
    qrContainer: {
        alignItems: 'center',
        marginVertical: 10,
    },
    pinContainer: {
        alignItems: 'center',
        marginVertical: 5,
    },
    pinLabel: {
        fontSize: 14,
        color: '#666',
    },
    pinValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#366732',
        letterSpacing: 4,
        marginTop: 4,
    },
    visitorDetails: {
        marginTop: 5,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 16,
    },
    detailSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    detailItem: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    detailItemLabel: {
        fontSize: 14,
        color: '#666',
        width: 120,
    },
    detailItemValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
        fontWeight: '500',
    },
    modalActions: {
        marginTop: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom:30
    },
    modalActionButton: {
        backgroundColor: '#366732',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    modalActionText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default GatePassHistoryScreen;

