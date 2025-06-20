import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
  Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RazorpayCheckout from 'react-native-razorpay';
import firestore from '@react-native-firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';

const SubscriptionPlansScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { communityData } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  useEffect(() => {
    calculateSubscription();
  }, []);

  const calculateSubscription = () => {
    const flats = parseInt(communityData.totalResidents) || 0;
    const maintenance = parseFloat(communityData.monthlyMaintenanceAmount) || 2000;
    
    // These values can be adjusted as needed
    const razorpayRate = 2;
    const gstRate = 18;
    const yourCharges = 5000;
    const profitMargin = 20;
    const activeUsersPercent = 30;
    const dailyPosts = 15;
    const avgImagesPerPost = 2;
    const avgImageSize = 1.5;
    const dailyLogins = Math.floor(flats * 3 * activeUsersPercent / 100);
    const smsAuth = 50;
    const userProfiles = 20;
    const chatMessages = 500;

    // Firebase pricing (Mumbai region + 18% GST)
    const FIREBASE_PRICING = {
      reads: 0.036 * 1.18 / 100000,
      writes: 0.108 * 1.18 / 100000,
      storage: 0.18 * 1.18,
      bandwidth: 0.12 * 1.18,
      sms: 0.01 * 82 * 1.18,
      functions: 0.4 * 82 * 1.18 / 1000000,
      freeTier: {
        reads: 50000,
        writes: 20000,
        storage: 1,
        bandwidth: 10
      }
    };

    // Calculate Firebase costs
    const totalUsers = flats * 3;
    const dailyActiveUsers = Math.floor(totalUsers * activeUsersPercent / 100);
    const dailyImageUploads = (dailyPosts * avgImagesPerPost) + (userProfiles * 2);
    const dailyReads = dailyLogins * 5 + dailyActiveUsers * 15 + chatMessages * 0.5;
    const dailyWrites = dailyPosts + userProfiles + chatMessages + dailyLogins * 0.5;
    
    const monthlyReads = dailyReads * 30;
    const monthlyWrites = dailyWrites * 30;
    const monthlyImages = dailyImageUploads * 30;
    const monthlyStorageSize = monthlyImages * avgImageSize / 1024;
    const monthlyBandwidth = monthlyImages * avgImageSize * 2 / 1024;
    const monthlyFunctionCalls = (dailyLogins + dailyPosts + userProfiles) * 30 * 3;
    
    const freeMonthlyReads = FIREBASE_PRICING.freeTier.reads * 30;
    const freeMonthlyWrites = FIREBASE_PRICING.freeTier.writes * 30;
    const freeMonthlyStorage = FIREBASE_PRICING.freeTier.storage;
    const freeMonthlyBandwidth = FIREBASE_PRICING.freeTier.bandwidth;
    
    const billableReads = Math.max(0, monthlyReads - freeMonthlyReads);
    const billableWrites = Math.max(0, monthlyWrites - freeMonthlyWrites);
    const billableStorage = Math.max(0, monthlyStorageSize - freeMonthlyStorage);
    const billableBandwidth = Math.max(0, monthlyBandwidth - freeMonthlyBandwidth);
    
    const readsCost = billableReads * FIREBASE_PRICING.reads;
    const writesCost = billableWrites * FIREBASE_PRICING.writes;
    const storageCost = billableStorage * FIREBASE_PRICING.storage;
    const bandwidthCost = billableBandwidth * FIREBASE_PRICING.bandwidth;
    const smsCost = smsAuth * FIREBASE_PRICING.sms;
    const functionsCost = monthlyFunctionCalls * FIREBASE_PRICING.functions;
    
    const totalFirebaseCost = readsCost + writesCost + storageCost + bandwidthCost + smsCost + functionsCost;
    
    // Calculate subscription costs
    const totalMaintenance = flats * maintenance;
    const razorpayCharges = (totalMaintenance * razorpayRate) / 100;
    const gstCharges = (razorpayCharges * gstRate) / 100;
    const subtotal = razorpayCharges + gstCharges + totalFirebaseCost + yourCharges;
    const profitAmount = (subtotal * profitMargin) / 100;
    const totalSubscription = subtotal + profitAmount;
    const roundedSubscription = Math.ceil(totalSubscription / 100) * 100;
    const perFlat = Math.round(roundedSubscription / flats);

    // Calculate different subscription plans
    const monthlyPrice = roundedSubscription;
    const quarterlyPrice = Math.round(monthlyPrice * 3 * 0.95); // 5% discount
    const halfYearlyPrice = Math.round(monthlyPrice * 6 * 0.9); // 10% discount
    const yearlyPrice = Math.round(monthlyPrice * 12 * 0.85); // 15% discount

    setSubscriptionData({
      monthly: {
        price: monthlyPrice,
        perFlat: perFlat,
        period: 'Monthly',
        duration: '1 Month',
        discount: 0,
        popular: false
      },
      quarterly: {
        price: quarterlyPrice,
        perFlat: Math.round(quarterlyPrice / flats / 3),
        period: 'Quarterly',
        duration: '3 Months',
        discount: 5,
        popular: false
      },
      halfYearly: {
        price: halfYearlyPrice,
        perFlat: Math.round(halfYearlyPrice / flats / 6),
        period: 'Half Yearly',
        duration: '6 Months',
        discount: 10,
        popular: true
      },
      yearly: {
        price: yearlyPrice,
        perFlat: Math.round(yearlyPrice / flats / 12),
        period: 'Yearly',
        duration: '12 Months',
        discount: 15,
        popular: false
      },
      firebaseCosts: {
        total: totalFirebaseCost,
        reads: readsCost,
        writes: writesCost,
        storage: storageCost,
        bandwidth: bandwidthCost,
        sms: smsCost,
        functions: functionsCost
      }
    });
  };

  const paymentMethods = [
    {
      id: 'card',
      name: 'Card',
      subtitle: 'Credit/Debit Card',
      icon: 'credit-card',
      color: '#4CAF50'
    },
    {
      id: 'upi',
      name: 'UPI ID',
      subtitle: 'Enter UPI ID',
      icon: 'account-arrow-right',
      color: '#FF9800'
    },
    {
      id: 'qr',
      name: 'QR Code',
      subtitle: 'Scan & Pay',
      icon: 'qrcode-scan',
      color: '#2196F3'
    },
    {
      id: 'gpay',
      name: 'Google Pay',
      subtitle: 'Pay with GPay',
      icon: 'google',
      color: '#4285F4'
    },
    {
      id: 'phonepe',
      name: 'PhonePe',
      subtitle: 'Pay with PhonePe',
      icon: 'cellphone',
      color: '#5F259F'
    },
    {
      id: 'paytm',
      name: 'Paytm',
      subtitle: 'Pay with Paytm',
      icon: 'wallet',
      color: '#00BAF2'
    },
    {
      id: 'amazonpay',
      name: 'Amazon Pay',
      subtitle: 'Pay with Amazon',
      icon: 'amazon',
      color: '#FF9900'
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      subtitle: 'All Banks',
      icon: 'bank',
      color: '#795548'
    }
  ];

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
  };

  const initiatePayment = () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a subscription plan first');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
  };

  const processPayment = () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setShowPaymentModal(false);
    setLoading(true);

    const options = {
      description: `${selectedPlan.period} Subscription - ${selectedPlan.duration}`,
      image: 'https://your-logo-url.png',
      currency: 'INR',
      key: 'rzp_test_YOUR_RAZORPAY_KEY', // Replace with your Razorpay key
      amount: selectedPlan.price * 100, // in paise
      name: communityData.name,
      prefill: {
        email: communityData.contactEmail,
        contact: communityData.contactPhone,
        name: communityData.name + ' Community'
      },
      theme: { color: '#366732' },
      method: getPaymentMethod(selectedPaymentMethod.id),
      config: getPaymentConfig(selectedPaymentMethod.id)
    };

    RazorpayCheckout.open(options)
      .then(async (data) => {
        // Payment success
        await completeRegistration(data);
        Alert.alert(
          'Payment Successful! 🎉', 
          'Your community has been registered successfully. Welcome aboard!',
          [
            { text: 'Continue', onPress: () => navigation.navigate('CommunitySelect') }
          ]
        );
      })
      .catch((error) => {
        // Payment failure
        Alert.alert('Payment Failed', error.description || 'Payment was not completed. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const getPaymentMethod = (methodId) => {
    const methodMap = {
      'card': 'card',
      'upi': 'upi',
      'qr': 'upi',
      'gpay': 'upi',
      'phonepe': 'upi',
      'paytm': 'wallet',
      'amazonpay': 'wallet',
      'netbanking': 'netbanking'
    };
    return methodMap[methodId] || 'card';
  };

  const getPaymentConfig = (methodId) => {
    if (methodId === 'gpay') {
      return { 'upi': { 'flow': 'intent', 'apps': ['googlepay'] } };
    } else if (methodId === 'phonepe') {
      return { 'upi': { 'flow': 'intent', 'apps': ['phonepe'] } };
    } else if (methodId === 'paytm') {
      return { 'wallet': { 'paytm': true } };
    }
    return {};
  };

  const completeRegistration = async (paymentData) => {
    try {
      const communityDoc = {
        ...communityData,
        totalResidents: parseInt(communityData.totalResidents),
        monthlyMaintenanceAmount: parseFloat(communityData.monthlyMaintenanceAmount),
        subscriptionPlan: selectedPlan.period.toLowerCase(),
        subscriptionAmount: selectedPlan.price,
        subscriptionStartDate: firestore.FieldValue.serverTimestamp(),
        subscriptionEndDate: calculateEndDate(selectedPlan.period.toLowerCase()),
        paymentStatus: 'paid',
        paymentId: paymentData.razorpay_payment_id,
        paymentMethod: selectedPaymentMethod.name,
        status: 'active',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('communities').add(communityDoc);
    } catch (error) {
      console.error('Error saving community:', error);
      throw error;
    }
  };

  const calculateEndDate = (period) => {
    const now = new Date();
    switch (period) {
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'quarterly':
        return new Date(now.setMonth(now.getMonth() + 3));
      case 'half yearly':
        return new Date(now.setMonth(now.getMonth() + 6));
      case 'yearly':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        return new Date(now.setMonth(now.getMonth() + 1));
    }
  };

  if (!subscriptionData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#366732" />
        <Text style={styles.loadingText}>Calculating subscription plans...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Subscription</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.subscriptionContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Select Your Plan</Text>
          <Text style={styles.subtitle}>
            For {communityData.totalResidents} flats • ₹{communityData.monthlyMaintenanceAmount} maintenance per flat
          </Text>
        </View>

        <View style={styles.planContainer}>
          {['monthly', 'quarterly', 'halfYearly', 'yearly'].map((planKey) => {
            const planData = subscriptionData[planKey];
            const isSelected = selectedPlan?.period === planData.period;
            
            return (
              <TouchableOpacity 
                key={planKey}
                style={[
                  styles.planCard,
                  isSelected && styles.selectedPlanCard,
                  planData.popular && isSelected && styles.popularPlanCard
                ]}
                onPress={() => handlePlanSelect(planData)}
                activeOpacity={0.8}
              >
                {planData.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>MOST POPULAR</Text>
                  </View>
                )}
                
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Icon name="check-circle" size={20} color="#fff" />
                  </View>
                )}
                
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{planData.period}</Text>
                  <Text style={styles.planDuration}>{planData.duration}</Text>
                </View>
                
                <View style={styles.priceContainer}>
                  <Text style={styles.planPrice}>₹{planData.price.toLocaleString('en-IN')}</Text>
                  <Text style={styles.planPerFlat}>₹{planData.perFlat}/flat/month</Text>
                </View>
                
                {planData.discount > 0 && (
                  <View style={styles.discountContainer}>
                    <Icon name="tag" size={14} color="#28a745" />
                    <Text style={styles.planDiscount}>Save {planData.discount}%</Text>
                  </View>
                )}
                
                <View style={styles.planFeatures}>
                  <View style={styles.featureItem}>
                    <Icon name="check" size={16} color="#28a745" />
                    <Text style={styles.featureText}>Complete community management</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Icon name="check" size={16} color="#28a745" />
                    <Text style={styles.featureText}>Maintenance tracking & billing</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Icon name="check" size={16} color="#28a745" />
                    <Text style={styles.featureText}>24/7 customer support</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* <View style={styles.costBreakdown}>
          <Text style={styles.breakdownTitle}>💰 Cost Breakdown (Monthly)</Text>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Firebase Services</Text>
            <Text style={styles.costValue}>₹{subscriptionData.firebaseCosts.total.toFixed(0)}</Text>
          </View>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Payment Gateway</Text>
            <Text style={styles.costValue}>₹{(subscriptionData.monthly.price * 0.02).toFixed(0)}</Text>
          </View>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>GST</Text>
            <Text style={styles.costValue}>₹{(subscriptionData.monthly.price * 0.02 * 0.18).toFixed(0)}</Text>
          </View>
          <View style={[styles.costItem, styles.totalCost]}>
            <Text style={styles.totalLabel}>Total Monthly Cost</Text>
            <Text style={styles.totalValue}>₹{subscriptionData.monthly.price.toLocaleString('en-IN')}</Text>
          </View>
        </View> */}
      </ScrollView>

      {selectedPlan && (
        <View style={styles.payButtonContainer}>
          <TouchableOpacity 
            style={styles.payButton}
            onPress={initiatePayment}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="credit-card" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.payButtonText}>
                  Pay ₹{selectedPlan.price.toLocaleString('en-IN')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Enhanced Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPaymentModal}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={styles.modalBackground}
            onPress={() => setShowPaymentModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.paymentSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Plan:</Text>
                  <Text style={styles.summaryValue}>{selectedPlan?.period} ({selectedPlan?.duration})</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount:</Text>
                  <Text style={styles.summaryValue}>₹{selectedPlan?.price.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Community:</Text>
                  <Text style={styles.summaryValue}>{communityData.name}</Text>
                </View>
              </View>
              
              <ScrollView style={styles.paymentMethodsContainer} showsVerticalScrollIndicator={false}>
                {paymentMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethodCard,
                      selectedPaymentMethod?.id === method.id && styles.selectedPaymentMethod
                    ]}
                    onPress={() => handlePaymentMethodSelect(method)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.methodIcon, { backgroundColor: method.color + '20' }]}>
                      <Icon name={method.icon} size={24} color={method.color} />
                    </View>
                    <View style={styles.methodInfo}>
                      <Text style={styles.methodName}>{method.name}</Text>
                      <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
                    </View>
                    {selectedPaymentMethod?.id === method.id && (
                      <Icon name="check-circle" size={20} color="#366732" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.confirmButton,
                  !selectedPaymentMethod && styles.disabledButton
                ]}
                onPress={processPayment}
                disabled={!selectedPaymentMethod}
              >
                <Text style={styles.confirmButtonText}>
                  Pay ₹{selectedPlan?.price.toLocaleString('en-IN')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#366732',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  subscriptionContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  planContainer: {
    marginBottom: 30,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    position: 'relative',
  },
  selectedPlanCard: {
    borderColor: '#366732',
    backgroundColor: '#366732' + '05',
  },
  popularPlanCard: {
    borderColor: '#FF6B35',
    backgroundColor: '#366732' + '05',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 5,
    backgroundColor: '#366732',
    borderRadius: 20,
    padding: 4,
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  planDuration: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  priceContainer: {
    marginBottom: 12,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  planPerFlat: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planDiscount: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    marginLeft: 4,
  },
  planFeatures: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
    flex: 1,
  },
  costBreakdown: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  costLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  costValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  totalCost: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#366732',
  },
  payButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  payButton: {
    backgroundColor: '#366732',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#366732',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
      },
      modalBackground: {
        flex: 1,
      },
      modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 20,
      },
      modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
      },
      modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
      },
      modalContent: {
        paddingHorizontal: 20,
      },
      paymentSummary: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        marginBottom: 16,
      },
      summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
      },
      summaryLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
      },
      summaryValue: {
        fontSize: 14,
        color: '#1a1a1a',
        fontWeight: '600',
      },
      paymentMethodsContainer: {
        maxHeight: 300,
      },
      paymentMethodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e8e8e8',
      },
      selectedPaymentMethod: {
        borderColor: '#366732',
        backgroundColor: '#36673210',
      },
      methodIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
      },
      methodInfo: {
        flex: 1,
      },
      methodName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
      },
      methodSubtitle: {
        fontSize: 12,
        color: '#666',
      },
      modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
      },
      cancelButton: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        alignItems: 'center',
        marginRight: 10,
      },
      cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
      },
      confirmButton: {
        flex: 1,
        padding: 16,
        backgroundColor: '#366732',
        borderRadius: 12,
        alignItems: 'center',
        marginLeft: 10,
      },
      disabledButton: {
        opacity: 0.6,
      },
      confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
      },
    });


    export default SubscriptionPlansScreen;