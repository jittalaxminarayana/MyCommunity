import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Login from '../screens/Auth/Login';
import CommunitySelect from '../screens/Auth/CommunitySelect';

const Stack = createStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator initialRouteName="CommunitySelect">

      <Stack.Screen  name="CommunitySelect" component={CommunitySelect}  options={{ headerShown: false}} />

      <Stack.Screen name="Login"  component={Login} options={{ headerShown: false}}/>

    </Stack.Navigator>
  );
};