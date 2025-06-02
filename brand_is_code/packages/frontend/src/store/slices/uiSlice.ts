import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  isDarkMode: boolean
  sidebarOpen: boolean
  notifications: {
    id: string
    type: 'success' | 'error' | 'info' | 'warning'
    message: string
  }[]
}

const initialState: UiState = {
  isDarkMode: false,
  sidebarOpen: true,
  notifications: []
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDarkMode(state) {
      state.isDarkMode = !state.isDarkMode
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
    addNotification(
      state,
      action: PayloadAction<{
        type: 'success' | 'error' | 'info' | 'warning'
        message: string
      }>
    ) {
      const id = Date.now().toString()
      state.notifications.push({
        id,
        type: action.payload.type,
        message: action.payload.message
      })
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      )
    }
  }
})

export const {
  toggleDarkMode,
  toggleSidebar,
  setSidebarOpen,
  addNotification,
  removeNotification
} = uiSlice.actions

export default uiSlice.reducer
