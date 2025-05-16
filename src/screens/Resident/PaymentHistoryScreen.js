import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
} from 'react-native';
import { firebase } from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';

const PaymentHistoryScreen = ({ navigation }) => {
    const userData = useSelector((state) => state.user.userData);
    const communityData = useSelector((state) => state.user.communityData);

    // States
    const [loading, setLoading] = useState(true);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

    // Fetch payment history
    useEffect(() => {
        const fetchPaymentHistory = async () => {
            try {
                const historyRef = firebase.firestore()
                    .collection('communities')
                    .doc(communityData.id)
                    .collection('paymentHistory')
                    .where('apartmentId', '==', userData.apartmentId);

                const unsubscribe = historyRef.onSnapshot((snapshot) => {
                    const payments = [];
                    snapshot.forEach((doc) => {
                        payments.push({
                            id: doc.id,
                            ...doc.data(),
                            paymentDate: doc.data().paymentDate?.toDate() || new Date(),
                        });
                    });
                    // Sort payments by date, newest first
                    payments.sort((a, b) => b.paymentDate - a.paymentDate);
                    setPaymentHistory(payments);
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching payment history:", error);
                    setLoading(false);
                });

                return unsubscribe;
            } catch (error) {
                console.error("Error setting up payment history listener:", error);
                setLoading(false);
            }
        };

        fetchPaymentHistory();
    }, [communityData.id, userData.apartmentId]);

    // View payment receipt
    const handleViewReceipt = (payment) => {
        setSelectedPayment(payment);
        setShowReceiptModal(true);
    };

    // Generate payment receipt ID
    const generateReceiptNumber = (payment) => {
        // Create a unique receipt number based on payment ID
        return `RCP${payment.id.substring(0, 6).toUpperCase()}`;
    };

    // Get appropriate icon for payment mode
    const getPaymentModeIcon = (mode) => {
        switch(mode) {
            case 'cash':
                return 'cash';
            case 'cheque':
                return 'checkbox-marked-circle-outline';
            case 'upi':
                return 'qrcode-scan';
            case 'google_pay':
                return 'google';
            case 'phonepe':
                return 'cellphone';
            case 'paytm':
                return 'wallet';
            case 'netbanking':
                return 'bank';
            case 'online':
            default:
                return 'credit-card-outline';
        }
    };

    // Format payment mode for display
    const formatPaymentMode = (mode) => {
        switch(mode) {
            case 'google_pay':
                return 'Google Pay';
            case 'phonepe':
                return 'PhonePe';
            case 'netbanking':
                return 'Net Banking';
            default:
                return mode.charAt(0).toUpperCase() + mode.slice(1);
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
                <Text style={styles.headerTitle}>Payment History</Text>
                <View style={styles.headerRightSpace}></View>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#366732" />
                    <Text style={styles.loaderText}>Loading payment history...</Text>
                </View>
            ) : paymentHistory.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Icon name="history" size={80} color="#366732" />
                    <Text style={styles.emptyText}>No payment history found</Text>
                    <Text style={styles.emptySubText}>Your payment records will appear here</Text>
                </View>
            ) : (
                <ScrollView style={styles.contentContainer}>
                    <Text style={styles.sectionTitle}>Your Payment Records</Text>
                    <Text style={styles.apartmentInfo}>
                        Apartment: <Text style={styles.apartmentId}>{userData.apartmentId}</Text>
                    </Text>

                    {paymentHistory.map((payment) => (
                        <View key={payment.id} style={styles.paymentCard}>
                            <View style={styles.paymentHeader}>
                                <View style={styles.paymentHeaderLeft}>
                                    <Text style={styles.paymentMonth}>{payment.month}</Text>
                                    <Text style={styles.paymentDate}>
                                        {format(payment.paymentDate, 'MMM dd, yyyy')}
                                    </Text>
                                </View>
                                <View style={styles.paymentStatus}>
                                    <Icon name="check-circle" size={16} color="#27ae60" />
                                    <Text style={styles.statusText}>{payment.status}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.paymentInfo}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Amount Paid:</Text>
                                    <Text style={styles.infoValue}>₹{payment.amount.toLocaleString()}</Text>
                                </View>
                                
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Payment Mode:</Text>
                                    <View style={styles.paymentModeContainer}>
                                        <Icon 
                                            name={getPaymentModeIcon(payment.paymentMode)} 
                                            size={16} 
                                            color="#366732" 
                                            style={styles.paymentModeIcon}
                                        />
                                        <Text style={styles.infoValue}>
                                            {formatPaymentMode(payment.paymentMode)}
                                        </Text>
                                    </View>
                                </View>
                                
                                {payment.notes && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Note:</Text>
                                        <Text style={styles.infoValue}>{payment.notes}</Text>
                                    </View>
                                )}
                            </View>
                            
                            <TouchableOpacity 
                                style={styles.receiptButton}
                                onPress={() => handleViewReceipt(payment)}
                            >
                                <Icon name="receipt" size={20} color="#366732" />
                                <Text style={styles.receiptButtonText}>View Receipt</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Receipt Modal */}
            <Modal
                visible={showReceiptModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowReceiptModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Payment Receipt</Text>
                            <TouchableOpacity 
                                onPress={() => setShowReceiptModal(false)}
                            >
                                <Icon name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {selectedPayment && (
                            <ScrollView style={styles.receiptContainer}>
                                <View style={styles.receiptHeader}>
                                    <Icon name="check-circle" size={50} color="#366732" />
                                    <Text style={styles.receiptTitle}>Payment Successful</Text>
                                    <Text style={styles.receiptAmount}>₹{selectedPayment.amount.toLocaleString()}</Text>
                                </View>

                                <View style={styles.receiptInfo}>
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.receiptLabel}>Receipt No:</Text>
                                        <Text style={styles.receiptValue}>{generateReceiptNumber(selectedPayment)}</Text>
                                    </View>
                                    
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.receiptLabel}>Payment Date:</Text>
                                        <Text style={styles.receiptValue}>
                                            {format(selectedPayment.paymentDate, 'MMM dd, yyyy h:mm a')}
                                        </Text>
                                    </View>
                                    
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.receiptLabel}>Payment Mode:</Text>
                                        <Text style={styles.receiptValue}>
                                            {formatPaymentMode(selectedPayment.paymentMode)}
                                        </Text>
                                    </View>
                                    
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.receiptLabel}>Payment For:</Text>
                                        <Text style={styles.receiptValue}>{selectedPayment.month} Maintenance</Text>
                                    </View>
                                    
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.receiptLabel}>Apartment:</Text>
                                        <Text style={styles.receiptValue}>{selectedPayment.apartmentId}</Text>
                                    </View>
                                    
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.receiptLabel}>Status:</Text>
                                        <Text style={styles.receiptValueSuccess}>{selectedPayment.status}</Text>
                                    </View>
                                    
                                    {selectedPayment.notes && (
                                        <View style={styles.receiptRow}>
                                            <Text style={styles.receiptLabel}>Note:</Text>
                                            <Text style={styles.receiptValue}>{selectedPayment.notes}</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.receiptFooter}>
                                    <Text style={styles.communityName}>{communityData.name}</Text>
                                    <Text style={styles.receiptFooterText}>
                                        Thank you for your payment!
                                    </Text>
                                </View>

                                <TouchableOpacity 
                                    style={styles.downloadButton}
                                    onPress={() => {
                                        setShowReceiptModal(false);
                                        Alert.alert(
                                            "Download Receipt", 
                                            "Receipt download feature will be implemented in future updates."
                                        );
                                    }}
                                >
                                    <Icon name="download" size={20} color="#fff" />
                                    <Text style={styles.downloadButtonText}>Download Receipt</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.shareButton}
                                    onPress={() => {
                                        setShowReceiptModal(false);
                                        Alert.alert(
                                            "Share Receipt", 
                                            "Receipt sharing feature will be implemented in future updates."
                                        );
                                    }}
                                >
                                    <Icon name="share-variant" size={20} color="#366732" />
                                    <Text style={styles.shareButtonText}>Share Receipt</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
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
        width: 24, // Balance with back button
    },
    contentContainer: {
        padding: 16,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#366732',
        marginTop: 20,
    },
    emptySubText: {
        fontSize: 16,
        color: '#666',
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    apartmentInfo: {
        fontSize: 16,
        color: '#555',
        marginBottom: 16,
    },
    apartmentId: {
        fontWeight: 'bold',
        color: '#366732',
    },
    paymentCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    paymentHeaderLeft: {
        flex: 1,
    },
    paymentMonth: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    paymentDate: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    paymentStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e9f7ef',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#27ae60',
        marginLeft: 4,
    },
    paymentInfo: {
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 15,
        color: '#666',
    },
    infoValue: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    paymentModeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentModeIcon: {
        marginRight: 6,
    },
    receiptButton: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#366732',
    },
    receiptButtonText: {
        color: '#366732',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 20,
        maxHeight: '80%',
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    receiptContainer: {
        padding: 16,
    },
    receiptHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    receiptTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#366732',
        marginTop: 12,
        marginBottom: 8,
    },
    receiptAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f68422',
    },
    receiptInfo: {
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    receiptLabel: {
        fontSize: 15,
        color: '#666',
    },
    receiptValue: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
        marginLeft: 8,
    },
    receiptValueSuccess: {
        fontSize: 15,
        color: '#27ae60',
        fontWeight: 'bold',
        textAlign: 'right',
        flex: 1,
        marginLeft: 8,
    },
    receiptFooter: {
        alignItems: 'center',
        marginBottom: 24,
    },
    communityName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#366732',
        marginBottom: 8,
    },
    receiptFooterText: {
        fontSize: 14,
        color: '#666',
    },
    downloadButton: {
        backgroundColor: '#366732',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
    },
    downloadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    shareButton: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#366732',
        marginBottom: 16,
    },
    shareButtonText: {
        color: '#366732',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default PaymentHistoryScreen;