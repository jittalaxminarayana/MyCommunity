import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Login from '../screens/Auth/Login';
import CommunitySelect from '../screens/Auth/CommunitySelect';
import CommunityRegistration from '../screens/Auth/CommunityRegistration';
import SubscriptionPlansScreen from '../screens/Auth/SubscriptionPlansScreen';

const Stack = createStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator initialRouteName="CommunitySelect">
      <Stack.Screen  name="CommunitySelect" component={CommunitySelect}  options={{ headerShown: false}} />
      <Stack.Screen  name="CommunityRegistration" component={CommunityRegistration}  options={{ headerShown: false}} />
      <Stack.Screen  name="SubscriptionPlansScreen" component={SubscriptionPlansScreen}  options={{ headerShown: false}} />
      <Stack.Screen name="Login"  component={Login} options={{ headerShown: false}}/>
    </Stack.Navigator>
  );
};