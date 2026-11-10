import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNavigation } from './MobileNavigation'
import { ToastContainer } from '@/components/shared/Toast'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { authService } from '@/services/authService'

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen bg-cp-bg text-cp-text">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Navigation */}
      <MobileNavigation open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMobileMenuOpen={() => setMobileNavOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Overlays */}
      <ToastContainer />
      <CommandPalette />
    </div>
  )
}
