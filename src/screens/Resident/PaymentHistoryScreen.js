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
    ToastAndroid,
    Platform
} from 'react-native';
import { firebase } from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { request, check, PERMISSIONS, RESULTS } from 'react-native-permissions';


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

    const generateHTML = (payment) => {
        return `
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .logo { width: 100px; height: 100px; margin: 0 auto; }
                .community-name { font-size: 22px; font-weight: bold; color: #366732; margin: 10px 0; }
                .receipt-title { font-size: 18px; font-weight: bold; margin: 20px 0; text-align: center; }
                .section { margin-bottom: 15px; }
                .section-title { font-weight: bold; color: #366732; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                .label { font-weight: bold; color: #666; }
                .value { color: #333; }
                .success { color: #27ae60; font-weight: bold; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                .signature { margin-top: 40px; border-top: 1px dashed #ccc; padding-top: 10px; text-align: right; }
            </style>
        </head>
        <body>
            <div class="header">
                ${communityData.profileImageUrl?.[0] ? 
                    `<img src="${communityData?.profileImageUrl[0]}" class="logo" />` : 
                    `<div class="logo">[Community Logo]</div>`
                }
                <div class="community-name">${communityData.name}</div>
                <div>${communityData?.address}</div>
                <div>Phone: ${communityData?.contactNumber} | Email: ${communityData?.contactEmail}</div>
            </div>

            <div class="receipt-title">PAYMENT RECEIPT</div>

            <div class="section">
                <div class="section-title">User Information</div>
                <div class="row">
                    <span class="label">Name:</span>
                    <span class="value">${userData?.name}</span>
                </div>
                <div class="row">
                    <span class="label">Apartment:</span>
                    <span class="value">${userData?.apartmentId}</span>
                </div>
                <div class="row">
                    <span class="label">Role:</span>
                    <span class="value">${userData?.role}</span>
                </div>
                <div class="row">
                    <span class="label">Occupancy Status:</span>
                    <span class="value">${userData?.occupancyStatus}</span>
                </div>
                <div class="row">
                    <span class="label">Contact:</span>
                    <span class="value">${userData?.phoneNumber} | ${userData?.email}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Payment Details</div>
                <div class="row">
                    <span class="label">Receipt Number:</span>
                    <span class="value">${generateReceiptNumber(payment)}</span>
                </div>
                <div class="row">
                    <span class="label">Payment Date:</span>
                    <span class="value">${format(payment.paymentDate, 'MMM dd, yyyy h:mm a')}</span>
                </div>
                <div class="row">
                    <span class="label">Payment For:</span>
                    <span class="value">${payment.month} Maintenance</span>
                </div>
                <div class="row">
                    <span class="label">Payment Mode:</span>
                    <span class="value">${formatPaymentMode(payment.paymentMode)}</span>
                </div>
                <div class="row">
                    <span class="label">Amount:</span>
                    <span class="value">₹${payment.amount.toLocaleString()}</span>
                </div>
                <div class="row">
                    <span class="label">Status:</span>
                    <span class="value success">${payment.status}</span>
                </div>
                ${payment.notes ? `
                <div class="row">
                    <span class="label">Notes:</span>
                    <span class="value">${payment.notes}</span>
                </div>
                ` : ''}
            </div>

            <div class="signature">
                <div>Authorized Signature</div>
            </div>

            <div class="footer">
                This is a computer generated receipt. No signature required.<br>
                ${communityData?.name} | ${communityData?.address}<br>
                Contact: ${communityData?.contactNumber} | ${communityData?.contactEmail}
            </div>
        </body>
        </html>
        `;
    };

    const generateAndDownloadPDF = async (payment) => {
        try {
            setShowReceiptModal(false);
            
            const options = {
                html: generateHTML(payment),
                fileName: `Receipt_${generateReceiptNumber(payment)}`,
                directory: 'Downloads',
            };

            const file = await RNHTMLtoPDF.convert(options);
            return file.filePath;
        } catch (error) {
            console.error("Error generating PDF:", error);
            Alert.alert(
                "Error",
                "Failed to generate receipt. Please try again.",
                [{ text: "OK" }]
            );
            return null;
        }
    };

    const requestStoragePermission = async () => {
        try {
          if (Platform.OS === 'android') {
            if (Platform.Version >= 33) {
              // For Android 13+
              const permissions = [
                PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
                PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
              ];
              
              // Check permissions first
              const checkResults = await Promise.all(
                permissions.map(permission => check(permission))
              );
              
              // If already granted, return true
              if (checkResults.every(result => result === RESULTS.GRANTED)) {
                return true;
              }
              
              // Request permissions
              const requestResults = await Promise.all(
                permissions.map(permission => request(permission))
              );
              
              return requestResults.every(result => result === RESULTS.GRANTED);
            } else if (Platform.Version >= 29) {
              // For Android 10-12
              const checkResult = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
              
              if (checkResult === RESULTS.GRANTED) {
                return true;
              }
              
              const requestResult = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
              return requestResult === RESULTS.GRANTED;
            } else {
              // For older Android versions
              const checkResult = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
              
              if (checkResult === RESULTS.GRANTED) {
                return true;
              }
              
              const requestResult = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
              return requestResult === RESULTS.GRANTED;
            }
          }
          return true; // iOS doesn't need this permission
        } catch (error) {
          console.error('Permission request error:', error);
          return false;
        }
      };

      const downloadReceipt = async (payment) => {
        try {
          setShowReceiptModal(false);
          
          const hasPermission = await requestStoragePermission();
          if (!hasPermission) {
            ToastAndroid.show('Storage permission denied', ToastAndroid.SHORT);
            return null;
          }
      
          const htmlContent = generateHTML(payment);
          const fileName = `Receipt_${generateReceiptNumber(payment)}.pdf`;
          
          // Use the public Downloads directory
          const downloadDir = '/storage/emulated/0/Download'; 
          const filePath = `${downloadDir}/${fileName}`;
      
          // Generate PDF options - let RNHTMLtoPDF handle the initial creation
          const options = {
            html: htmlContent,
            fileName: fileName,
            directory: 'Downloads', // This creates in app's cache initially
          };
      
          const file = await RNHTMLtoPDF.convert(options);
          
          // Always move to public Downloads directory
          await RNFS.moveFile(file.filePath, filePath);
          
          ToastAndroid.show(`Receipt saved to Downloads`, ToastAndroid.SHORT);
          return filePath;
          
        } catch (error) {
          console.error("Error generating PDF:", error);
          ToastAndroid.show('Failed to save receipt', ToastAndroid.SHORT);
          return null;
        }
      };

    const shareReceipt = async (payment) => {
        try {
            setShowReceiptModal(false);
            ToastAndroid.show('Sharing...', ToastAndroid.SHORT)
            
            // First generate the PDF
            const pdfPath = await generateAndDownloadPDF(payment);
            if (!pdfPath) return;

            // Prepare share options
            const shareOptions = {
                title: 'Share Receipt',
                message: `My payment receipt for ${payment.month} maintenance at ${communityData.name}`,
                url: `file://${pdfPath}`,
                type: 'application/pdf',
            };

            await Share.open(shareOptions);
            
            //delete the temporary file after sharing
            await RNFS.unlink(pdfPath);
        } catch (error) {
            if (error.message !== 'User did not share') {
                console.error("Error sharing receipt:", error);
                Alert.alert(
                    "Error",
                    "Failed to share receipt. Please try again.",
                    [{ text: "OK" }]
                );
            }
        }
    };

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
                                    <Text style={styles.infoLabel}>Paymet Type:</Text>
                                    <Text style={styles.infoValue}>{payment.type}</Text>
                                </View>

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
                            <ScrollView showsVerticalScrollIndicator={false} style={styles.receiptContainer}>
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
                                        downloadReceipt(selectedPayment);
                                    }}
                                >
                                    <Icon name="download" size={20} color="#fff" />
                                    <Text style={styles.downloadButtonText}>Download Receipt</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.shareButton}
                                    onPress={() => {
                                        setShowReceiptModal(false);
                                        shareReceipt(selectedPayment);
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
        marginBottom:20
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