import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './styles/AdminBottomNav.css';

const AdminBottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/admin', label: t('admin.nav.dashboard', 'Dashboard'), icon: '📊' },
    { path: '/admin/farmers', label: t('admin.nav.farmers', 'Farmers'), icon: '👨‍🌾' },
    { path: '/admin/customers', label: t('admin.nav.customers', 'Customers'), icon: '👥' },
    { path: '/admin/dealers', label: t('admin.nav.dealers', 'Dealers'), icon: '🚚' },
    { path: '/admin/orders', label: t('admin.nav.orders', 'Orders'), icon: '📦' },
    { path: '/admin/payments', label: t('admin.nav.payments', 'Payments'), icon: '💳' },
    { path: '/admin/complaints', label: t('admin.nav.complaints', 'Complaints'), icon: '⚠️' },
    { path: '/admin/reports', label: t('admin.nav.reports', 'Reports'), icon: '📈' },
    { path: '/admin/account', label: t('admin.nav.account', 'Account'), icon: '👤' }
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
