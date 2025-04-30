import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  userData: null,
  communityData: null,
  isAuthenticated: false,
  authChangeTimestamp: 0
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
      state.isAuthenticated = true;
      state.authChangeTimestamp = Date.now(); 
    },
    setCommunityData: (state, action) => {
      state.communityData = action.payload;
    },
    updateUserProfileUrl: (state, action) => {
      if (state.userData) {
        state.userData.profileImageUrl = action.payload;
      }
    },
    logout: (state) => {
      state.userData = null;
      state.communityData = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setUserData, setCommunityData, updateUserProfileUrl, logout } = userSlice.actions;
export default userSlice.reducer;