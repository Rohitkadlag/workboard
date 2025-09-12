import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '@workboard/shared';
import NotificationSystem from './NotificationSystem.jsx';
import { 
  Home, 
  FolderOpen, 
  Ticket, 
  Calendar, 
  CheckCircle, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const iconMap = {
    '🏠': Home,
    '📋': FolderOpen,
    '🎫': Ticket,
    '🏖️': Calendar,
    '✅': CheckCircle,
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

  const getRoleColor = (role) => {
    switch (role) {
      case ROLES.ADMIN:
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case ROLES.MANAGER:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                    <span className="text-white font-bold text-lg">W</span>
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-xl opacity-20 group-hover:opacity-30 transition-opacity duration-300 blur-sm"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Workboard
                  </span>
                  <span className="text-xs text-gray-500 -mt-1">Project Management</span>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              {navItems.map((item) => {
                const IconComponent = iconMap[item.icon];
                const isActive = isActivePath(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 ${
                      isActive
                        ? 'text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md border border-blue-100/50'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-white/60 hover:shadow-md'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl"></div>
                    )}
                    <IconComponent className={`w-4 h-4 transition-colors duration-200 ${
                      isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                    }`} />
                    <span className="relative">{item.name}</span>
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="hidden sm:block">
                <NotificationSystem />
              </div>
              
              {/* User info */}
              <div className="hidden sm:flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    Welcome, {user?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.email}
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm ${getRoleColor(user?.role)}`}>
                  {user?.role}
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
              >
                <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className={`md:hidden border-t border-gray-100 transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <div className="px-4 pt-4 pb-6 space-y-2 bg-white/90 backdrop-blur-sm">
            {/* Mobile user info */}
            <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
              <div className={`px-2 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider ${getRoleColor(user?.role)}`}>
                {user?.role}
              </div>
            </div>

            {/* Mobile notifications */}
            <div className="mb-4">
              <NotificationSystem />
            </div>

            {/* Mobile nav items */}
            {navItems.map((item) => {
              const IconComponent = iconMap[item.icon];
              const isActive = isActivePath(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 ${
                    isActive
                      ? 'text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`} />
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-indigo-400/10 to-cyan-400/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>
    </div>
  );
};

export default Layout;