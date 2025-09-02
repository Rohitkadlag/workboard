import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectBoard from './pages/ProjectBoard.jsx';
import LeavePage from './pages/LeavePage.jsx';
import LeaveApprovalsPage from './pages/LeaveApprovalsPage.jsx';
import TicketsPage from './pages/TicketsPage.jsx';
import TicketDetailPage from './pages/TicketDetailPage.jsx';
import { ROLES } from '@workboard/shared';

// Role-based route wrapper
const RoleGuard = ({ children, allowedRoles, userRole }) => {
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/projects" element={
              <PrivateRoute>
                <Layout>
                  <ProjectsPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/projects/:id" element={
              <PrivateRoute>
                <Layout>
                  <ProjectBoard />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/tickets" element={
              <PrivateRoute>
                <Layout>
                  <TicketsPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/tickets/:id" element={
              <PrivateRoute>
                <Layout>
                  <TicketDetailPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/leave" element={
              <PrivateRoute>
                <Layout>
                  <LeavePage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/leave/approvals" element={
              <PrivateRoute>
                {({ user }) => (
                  <RoleGuard 
                    allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]} 
                    userRole={user?.role}
                  >
                    <Layout>
                      <LeaveApprovalsPage />
                    </Layout>
                  </RoleGuard>
                )}
              </PrivateRoute>
            } />
            
            {/* Catch all route - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;