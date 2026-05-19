import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UIState {
  sidebarCollapsed: boolean
  theme: 'dark' | 'light'
  notificationPanelOpen: boolean
  commandPaletteOpen: boolean
}

const initialState: UIState = {
  sidebarCollapsed: false,
  theme: 'dark',
  notificationPanelOpen: false,
  commandPaletteOpen: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: state => { state.sidebarCollapsed = !state.sidebarCollapsed },
    setTheme: (state, action: PayloadAction<'dark' | 'light'>) => { state.theme = action.payload },
    toggleNotificationPanel: state => { state.notificationPanelOpen = !state.notificationPanelOpen },
    toggleCommandPalette: state => { state.commandPaletteOpen = !state.commandPaletteOpen },
  },
})

export const { toggleSidebar, setTheme, toggleNotificationPanel, toggleCommandPalette } = uiSlice.actions
export default uiSlice.reducer
