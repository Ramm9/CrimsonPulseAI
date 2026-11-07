import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

// Pages
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import ProjectsPage from '@/pages/ProjectsPage'
import ProjectDetailsPage from '@/pages/ProjectDetailsPage'
import APIExplorerPage from '@/pages/APIExplorerPage'
import EndpointDetailsPage from '@/pages/EndpointDetailsPage'
import LiveTrafficPage from '@/pages/LiveTrafficPage'
import AnomaliesPage from '@/pages/AnomaliesPage'
import AnomalyDetailsPage from '@/pages/AnomalyDetailsPage'
import IncidentsPage from '@/pages/IncidentsPage'
import IncidentDetailsPage from '@/pages/IncidentDetailsPage'
import ContractsPage from '@/pages/ContractsPage'
import AIInvestigatorPage from '@/pages/AIInvestigatorPage'
import IntegrationsPage from '@/pages/IntegrationsPage'
import SettingsPage from '@/pages/SettingsPage'

export const router = createBrowserRouter([
  // Public marketing & auth routes
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/landing',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },

  // Authenticated application shell routes
  {
    element: <AppLayout />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/projects',
        element: <ProjectsPage />,
      },
      {
        path: '/projects/:id',
        element: <ProjectDetailsPage />,
      },
      // API Explorer
      {
        path: '/explorer',
        element: <APIExplorerPage />,
      },
      {
        path: '/explorer/:id',
        element: <EndpointDetailsPage />,
      },
      {
        path: '/api-explorer',
        element: <APIExplorerPage />,
      },
      {
        path: '/api-explorer/:id',
        element: <EndpointDetailsPage />,
      },
      // Live Traffic
      {
        path: '/traffic',
        element: <LiveTrafficPage />,
      },
      {
        path: '/live-traffic',
        element: <LiveTrafficPage />,
      },
      // Anomalies
      {
        path: '/anomalies',
        element: <AnomaliesPage />,
      },
      {
        path: '/anomalies/:id',
        element: <AnomalyDetailsPage />,
      },
      // Incidents
      {
        path: '/incidents',
        element: <IncidentsPage />,
      },
      {
        path: '/incidents/:id',
        element: <IncidentDetailsPage />,
      },
      // Contract Validation
      {
        path: '/contracts',
        element: <ContractsPage />,
      },
      // AI Investigator
      {
        path: '/investigator',
        element: <AIInvestigatorPage />,
      },
      {
        path: '/ai-investigator',
        element: <AIInvestigatorPage />,
      },
      // Integrations
      {
        path: '/integrations',
        element: <IntegrationsPage />,
      },
      // Settings
      {
        path: '/settings',
        element: <SettingsPage />,
      },
    ],
  },

  // Fallback
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
