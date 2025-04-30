import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const  AdminDashboard = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to  Admin Dashboard</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default AdminDashboard;
