import React from 'react';
import { Provider } from 'react-redux';
import AppNavigator from "./src/navigation/AppNavigator";
import store from './src/store/store';

const App = () => {
  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
};

export default App;
