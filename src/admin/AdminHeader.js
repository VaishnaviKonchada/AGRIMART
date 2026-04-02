import React from 'react';
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import './styles/AdminHeader.css';

const AdminHeader = ({ user }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isMainDashboard = location.pathname === '/admin';

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/admin') return t('admin.dashboard.title', 'Admin Dashboard');
    if (path.includes('/admin/farmers')) return t('admin.farmers.title', 'Farmers Management');
    if (path.includes('/admin/customers')) return t('admin.customers.title', 'Customers Management');
    if (path.includes('/admin/dealers')) return t('admin.dealers.title', 'Transport Dealers Management');
    if (path.includes('/admin/orders')) return t('admin.orders.title', 'Orders Monitoring');
    if (path.includes('/admin/payments')) return t('admin.payments.title', 'Payments & Settlements');
    if (path.includes('/admin/complaints')) return t('admin.complaints.title', 'Complaints & Support');
    if (path.includes('/admin/reports')) return t('admin.reports.title', 'Reports');
    if (path.includes('/admin/account')) return t('admin.account.title', 'Admin Account');
    return t('admin.dashboard.title', 'Admin Dashboard');
  };

  return (
    <div className="admin-header">
      <div className="header-left">
        {!isMainDashboard && (
          <button className="header-back-btn" onClick={() => navigate('/admin')}>
            ← {t('common.back', 'Back')}
          </button>
        )}
        <div>
          <h1>{getPageTitle()}</h1>
          <p className="admin-subtitle">
            {t('admin.dashboard.welcome', 'Welcome back')}, {user?.name || t('admin.dashboard.administrator', 'Administrator')}
          </p>
        </div>
      </div>
      <div className="header-right">
        <LanguageSwitcher />
      </div>
    </div>
  );
};

export default AdminHeader;
