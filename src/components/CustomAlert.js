import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const CustomAlert = ({
  visible,
  title,
  message,
  onCancel,
  onOk,
  onProceed,
  cancelText = 'Cancel',
  okText = 'OK',
  proceedText = 'Proceed',
  showCancel = true,
  showOk = true,
  showProceed = false,
  alertType = 'default', // 'default', 'success', 'warning', 'error'
}) => {
  const getAlertStyles = () => {
    switch (alertType) {
      case 'success':
        return { borderColor: '#366732', titleColor: '#366732' };
      case 'warning':
        return { borderColor: '#FF9800', titleColor: '#FF9800' };
      case 'error':
        return { borderColor: '#F44336', titleColor: '#F44336' };
      default:
        return { borderColor: '#366732', titleColor: '#366732' };
    }
  };

  const alertStyles = getAlertStyles();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.alertContainer, { borderTopColor: alertStyles.borderColor }]}>
          {title && (
            <Text style={[styles.title, { color: alertStyles.titleColor }]}>
              {title}
            </Text>
          )}
          
          {message && (
            <Text style={styles.message}>
              {message}
            </Text>
          )}

          <View style={styles.buttonContainer}>
            {showCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            {showProceed && (
              <TouchableOpacity
                style={[styles.button, styles.proceedButton]}
                onPress={onProceed}
                activeOpacity={0.7}
              >
                <Text style={styles.proceedButtonText}>{proceedText}</Text>
              </TouchableOpacity>
            )}

            {showOk && (
              <TouchableOpacity
                style={[styles.button, styles.okButton]}
                onPress={onOk}
                activeOpacity={0.7}
              >
                <Text style={styles.okButtonText}>{okText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: width * 0.9 ,
    maxWidth: 350,
    borderTopWidth: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  okButton: {
    backgroundColor: '#366732',
  },
  proceedButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  okButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  proceedButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomAlert;