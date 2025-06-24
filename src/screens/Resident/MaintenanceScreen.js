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
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID } from '@env';

const MaintenanceScreen = ({ navigation }) => {
    const userData = useSelector((state) => state.user.userData);
    const communityData = useSelector((state) => state.user.communityData);

    // States
    const [loading, setLoading] = useState(true);
    const [maintenanceDues, setMaintenanceDues] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedDue, setSelectedDue] = useState(null);
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        const fetchMaintenanceDues = async () => {
            try {
                const duesRef = firebase.firestore()
                    .collection('communities')
                    .doc(communityData.id)
                    .collection('maintenanceDues')
                    .where('apartmentId', '==', userData.apartmentId)
                    .where('status', 'in', ['pending', 'overdue']);

                const unsubscribe = duesRef.onSnapshot((snapshot) => {
                    const dues = [];
                    snapshot.forEach((doc) => {
                        dues.push({
                            id: doc.id,
                            ...doc.data(),
                            dueDate: doc.data().dueDate?.toDate() || new Date(),
                        });
                    });
                    dues.sort((a, b) => b.dueDate - a.dueDate);
                    setMaintenanceDues(dues);
                    setLoading(false);
                });

                return unsubscribe;
            } catch (error) {
                console.error("Error fetching maintenance dues:", error);
                setLoading(false);
            }
        };

        fetchMaintenanceDues();
    }, [communityData.id, userData.apartmentId]);

    const handlePayNow = (due) => {
        setSelectedDue(due);
        setShowPaymentModal(true);
    };

    const processPayment = async () => {
        if (!selectedDue || !RAZORPAY_KEY_ID) {
            Alert.alert("Error", "Payment configuration error");
            return;
        }

        setProcessingPayment(true);
        
        const paymentAmount = selectedDue.status === 'overdue' 
            ? selectedDue.amount + (selectedDue.lateFee || 500) 
            : selectedDue.amount;

        const options = {
            description: `${selectedDue.month} Maintenance Payment`,
            image: communityData?.profileImageUrl ? communityData.profileImageUrl: 'https://img.freepik.com/free-vector/user-circles-set_78370-4704.jpg',
            currency: 'INR',
            key: RAZORPAY_KEY_ID,
            amount: paymentAmount * 100,
            name: communityData.name,
            prefill: {
                email: userData.email,
                contact: userData.phone,
                name: userData.name
            },
            theme: { color: '#366732' }
        };

        try {
            const razorpayData = await RazorpayCheckout.open(options);
            
            // Save payment record
            await firebase.firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('paymentHistory')
                .add({
                    userId: userData.id,
                    userName: userData.name,
                    apartmentId: userData.apartmentId,
                    dueId: selectedDue.id,
                    amount: paymentAmount,
                    paymentDate: firebase.firestore.FieldValue.serverTimestamp(),
                    paymentMode: 'razorpay',
                    transactionId: razorpayData.razorpay_payment_id,
                    type: 'Monthly maintenance',
                    status: 'Completed',
                    month: selectedDue.month,
                });

            // Update due status
            await firebase.firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('maintenanceDues')
                .doc(selectedDue.id)
                .update({
                    status: 'paid',
                    paymentId: razorpayData.razorpay_payment_id
                });

            Alert.alert(
                "Payment Successful", 
                `Your payment of ₹${paymentAmount.toLocaleString()} has been processed.`,
                [{ text: 'OK', onPress: () => setShowPaymentModal(false) }]
            );
        } catch (error) {
            if (error.code !== 2) { // Ignore user cancellation
                Alert.alert("Payment Failed", error.description || "Payment could not be completed");
            }
        } finally {
            setProcessingPayment(false);
        }
    };

    const renderDueStatus = (status) => {
        switch(status) {
            case 'pending': return <Text style={styles.statusPending}>Pending</Text>;
            case 'paid': return <Text style={styles.statusPaid}>Paid</Text>;
            case 'overdue': return <Text style={styles.statusOverdue}>Overdue</Text>;
            default: return <Text style={styles.statusPending}>{status}</Text>;
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Maintenance Dues</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#366732" />
                </View>
            </View>
        );
    }

    if (maintenanceDues.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Maintenance Dues</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.emptyContainer}>
                    <Icon name="check-circle-outline" size={80} color="#366732" />
                    <Text style={styles.emptyText}>No pending dues</Text>
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
                <Text style={styles.headerTitle}>Maintenance Dues</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.contentContainer}>
                <Text style={styles.sectionTitle}>Your Maintenance Dues</Text>
                <Text style={styles.apartmentInfo}>
                    Apartment: <Text style={styles.apartmentId}>{userData.apartmentId}</Text>
                </Text>

                {maintenanceDues.map((due) => (
                    <View key={due.id} style={styles.dueCard}>
                        <View style={styles.dueHeader}>
                            <Text style={styles.dueMonth}>{due.month}</Text>
                            {renderDueStatus(due.status)}
                        </View>
                        
                        <View style={styles.dueInfo}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Amount:</Text>
                                <Text style={styles.infoValue}>₹{due.amount.toLocaleString()}</Text>
                            </View>
                            
                            {due.status === 'overdue' && (
                                <>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Late Fee:</Text>
                                        <Text style={styles.infoValue}>₹{(due.lateFee || 500).toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Total Due:</Text>
                                        <Text style={styles.infoValueTotal}>
                                            ₹{(due.amount + (due.lateFee || 500)).toLocaleString()}
                                        </Text>
                                    </View>
                                </>
                            )}
                            
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Due Date:</Text>
                                <Text style={styles.infoValue}>
                                    {format(due.dueDate, 'MMM dd, yyyy')}
                                </Text>
                            </View>
                            
                            {/* Restored Notes Section */}
                            {due.notes && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Note:</Text>
                                    <Text style={styles.infoValue}>{due.notes}</Text>
                                </View>
                            )}
                        </View>
                        
                        {(due.status === 'pending' || due.status === 'overdue') && (
                            <TouchableOpacity 
                                style={styles.payButton}
                                onPress={() => handlePayNow(due)}
                            >
                                <Icon name="cash-multiple" size={20} color="#fff" />
                                <Text style={styles.payButtonText}>Pay Now</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </ScrollView>

            {/* Simplified Payment Confirmation Modal */}
            <Modal
                visible={showPaymentModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => !processingPayment && setShowPaymentModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Confirm Payment</Text>
                            {!processingPayment && (
                                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                                    <Icon name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {selectedDue && (
                            <View style={styles.paymentDetails}>
                                <Text style={styles.paymentTitle}>{selectedDue.month} Maintenance</Text>
                                
                                <View style={styles.paymentRow}>
                                    <Text style={styles.paymentLabel}>Amount:</Text>
                                    <Text style={styles.paymentValue}>₹{selectedDue.amount.toLocaleString()}</Text>
                                </View>
                                
                                {selectedDue.status === 'overdue' && (
                                    <View style={styles.paymentRow}>
                                        <Text style={styles.paymentLabel}>Late Fee:</Text>
                                        <Text style={styles.paymentValue}>₹{(selectedDue.lateFee || 500).toLocaleString()}</Text>
                                    </View>
                                )}
                                
                                <View style={[styles.paymentRow, styles.totalRow]}>
                                    <Text style={styles.paymentLabel}>Total Payable:</Text>
                                    <Text style={styles.paymentTotal}>
                                        ₹{(selectedDue.status === 'overdue' 
                                            ? selectedDue.amount + (selectedDue.lateFee || 500) 
                                            : selectedDue.amount).toLocaleString()}
                                    </Text>
                                </View>

                                <TouchableOpacity 
                                    style={styles.proceedButton}
                                    onPress={processPayment}
                                    disabled={processingPayment}
                                >
                                    {processingPayment ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
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
    historyButton: {
        marginTop: 20,
        backgroundColor: '#366732',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    historyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
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
    dueCard: {
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
    dueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    dueMonth: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statusPending: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#e67e22',
        backgroundColor: '#fef9e7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusPaid: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#27ae60',
        backgroundColor: '#e9f7ef',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusOverdue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#e74c3c',
        backgroundColor: '#fdedec',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    dueInfo: {
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        flexWrap: 'wrap',  
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
    infoValueTotal: {
        fontSize: 16,
        color: '#e74c3c',
        fontWeight: 'bold',
    },
    payButton: {
        backgroundColor: '#f68422',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    payButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
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
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
        paddingBottom: 30,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    paymentDetails: {
        paddingVertical: 16,
    },
    paymentTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#366732',
        marginBottom: 16,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    totalRow: {
        paddingTop: 12,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        marginBottom: 20,
    },
    paymentLabel: {
        fontSize: 16,
        color: '#555',
    },
    paymentValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    paymentTotal: {
        fontSize: 18,
        color: '#f68422',
        fontWeight: 'bold',
    },
    paymentMethodContainer: {
        marginBottom: 16,
    },
    paymentMethodLabel: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
    },
    pickerContainer: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
    paymentIcons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 24,
    },
    paymentIconBox: {
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        width: 70,
    },
    selectedPaymentMethod: {
        borderColor: '#366732',
        backgroundColor: '#e9f7ef',
    },
    paymentIconText: {
        fontSize: 12,
        marginTop: 4,
        color: '#555',
    },
    proceedButton: {
        backgroundColor: '#366732',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    proceedButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default MaintenanceScreen;