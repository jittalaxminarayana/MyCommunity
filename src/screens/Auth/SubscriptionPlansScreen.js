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
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RazorpayCheckout from 'react-native-razorpay';
import firestore from '@react-native-firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RAZORPAY_KEY_ID } from '@env';

const SubscriptionPlansScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { communityData } = route.params;

  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);

  useEffect(() => {
    calculateSubscription();
  }, []);

  const calculateSubscription = () => {
    const flats = parseInt(communityData.totalResidents) || 1; // Ensure minimum 1
    const maintenance = parseFloat(communityData.monthlyMaintenanceAmount) || 0;


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


  const processPayment = () => {
    if (!RAZORPAY_KEY_ID) {
      Alert.alert("Error", "Payment gateway configuration error");
      return;
    }

    setShowPaymentModal(false);
    setLoading(true);

    const options = {
      description: `${selectedPlan.period} Subscription - ${selectedPlan.duration}`,
      image: communityData?.profileImageUrl ? communityData.profileImageUrl: 'https://img.freepik.com/free-vector/user-circles-set_78370-4704.jpg',
      currency: 'INR',
      key: RAZORPAY_KEY_ID,
      amount: selectedPlan.price * 100,
      name: communityData.name,
      prefill: {
        email: communityData.contactEmail,
        contact: communityData.contactPhone,
        name: communityData.name + ' Community'
      },
      theme: { color: '#366732' }
    };

    RazorpayCheckout.open(options)
      .then(async (data) => {
        try {
          await completeRegistration(data);
          Alert.alert(
            'Payment Successful! 🎉',
            'Your community has been registered successfully.',
            [{ text: 'Continue', onPress: () => navigation.navigate('CommunitySelect') }]
          );
        } catch (error) {
          console.error('Registration error:', error);
          Alert.alert(
            'Payment Successful but Registration Failed',
            'Please contact support with your payment ID: ' + data.razorpay_payment_id
          );
        }
      })
      .catch((error) => {
        if (error.code !== 2) { // Ignore user cancellation
          Alert.alert('Payment Failed', error.description || 'Payment was not completed');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleBack = () => {
    if (loading) {
      Alert.alert("Payment in progress", "Please wait or cancel the payment");
      return;
    }
    navigation.goBack();
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
              <Text style={styles.modalTitle}>Confirm Payment</Text>
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
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={processPayment}
              >
                <Text style={styles.confirmButtonText}>
                  Pay Now ₹{selectedPlan?.price.toLocaleString('en-IN')}
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