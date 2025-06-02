import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  isAuthenticated: boolean
  user: {
    id: string
    email: string
    name: string
  } | null
  token: string | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true
      state.error = null
    },
    loginSuccess(state, action: PayloadAction<{ user: { id: string; email: string; name: string }; token: string }>) {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.token = action.payload.token
      state.loading = false
      state.error = null
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.loading = false
      state.error = action.payload
    },
    logout(state) {
      state.isAuthenticated = false
      state.user = null
      state.token = null
    }
  }
})

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions

export default authSlice.reducer
