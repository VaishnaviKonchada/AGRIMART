import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './styles/AdminBottomNav.css';

const AdminBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/farmers', label: 'Farmers', icon: '👨‍🌾' },
    { path: '/admin/customers', label: 'Customers', icon: '👥' },
    { path: '/admin/dealers', label: 'Dealers', icon: '🚚' },
    { path: '/admin/orders', label: 'Orders', icon: '📦' },
    { path: '/admin/payments', label: 'Payments', icon: '💳' },
    { path: '/admin/complaints', label: 'Complaints', icon: '⚠️' },
    { path: '/admin/reports', label: 'Reports', icon: '📈' },
    { path: '/admin/account', label: 'Account', icon: '👤' }
  ];

  return (
    <div className="admin-bottom-nav">
      <div className="nav-container">
        {navItems.map(item => (
          <button
            key={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            title={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminBottomNav;
