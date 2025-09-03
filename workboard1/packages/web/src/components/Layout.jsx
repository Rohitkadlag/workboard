import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '@workboard/shared';
import NotificationSystem from './NotificationSystem.jsx';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: '🏠' },
    { name: 'Projects', path: '/projects', icon: '📋' },
    { name: 'Tickets', path: '/tickets', icon: '🎫' },
    { name: 'Leave', path: '/leave', icon: '🏖️' },
  ];

  // Add Leave Approvals for Admin/Manager
  if (user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER) {
    navItems.splice(-1, 0, { name: 'Leave Approvals', path: '/leave/approvals', icon: '✅' });
  }

  const isActivePath = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">W</span>
                </div>
                <span className="text-xl font-bold text-slate-900">Workboard</span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActivePath(item.path)
                      ? 'text-brand-600 bg-brand-50'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <NotificationSystem />
              
              <div className="text-sm text-slate-600">
                <span className="hidden sm:inline">Welcome, </span>
                <span className="font-medium">{user?.name}</span>
                <span className="ml-2 px-2 py-1 bg-slate-100 rounded-md text-xs uppercase tracking-wide">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-outline btn-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden border-t">
          <div className="px-4 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                  isActivePath(item.path)
                    ? 'text-brand-600 bg-brand-50'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;