import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPut } from "../utils/api";
import './styles/ManagementPages.css';

const CustomersManagement = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const formatDate = (value) => {
    const parsed = value ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString();
  };

  useEffect(() => {
    const normalizeCustomer = (customer) => {
      const statusValue = String(customer?.status || 'active');
      const normalizedStatus = statusValue.charAt(0).toUpperCase() + statusValue.slice(1).toLowerCase();
      const blocked = statusValue.toLowerCase() === 'blocked';
      const profile = customer?.profile || {};

      return {
        ...customer,
        id: customer?.id || customer?._id,
        name: customer?.name || 'Customer',
        email: customer?.email || 'N/A',
        phone: customer?.phone || customer?.profile?.phone || 'N/A',
        profile,
        location: customer?.location || customer?.profile?.locationText || [customer?.profile?.mandal, customer?.profile?.district, customer?.profile?.state].filter(Boolean).join(', ') || 'N/A',
        joinDate: customer?.joinDate || customer?.createdAt || null,
        orders: Number(customer?.orders || 0),
        totalSpent: Number(customer?.totalSpent || 0),
        lastOrder: customer?.lastOrder || null,
        blocked,
        status: normalizedStatus,
      };
    };

    const fetchCustomers = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiGet('admin/customers-summary');
        if (Array.isArray(data)) {
          setCustomers(data.map(normalizeCustomer));
        } else if (data?.users) {
          setCustomers(data.users.map(normalizeCustomer));
        }
      } catch (error) {
        setError(t('admin.customers.noCustomers'));
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [t]);

  const toggleCustomerBlock = async (customerId) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const customer = customers.find(c => (c._id === customerId || c.id === customerId));
    const currentStatus = String(customer?.status || '').toLowerCase();
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';

    try {
      const updated = await apiPut(`admin/users/${customerId}/status`, { status: newStatus });
      if (updated && updated.user) {
        const statusValue = String(updated.user.status || 'active').toLowerCase();
        const normalizedStatus = statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
        setCustomers(prev => prev.map(c => {
          if (!(c._id === customerId || c.id === customerId)) return c;
          return {
            ...c,
            ...updated.user,
            id: updated.user.id || updated.user._id || c.id,
            status: normalizedStatus,
            blocked: statusValue === 'blocked',
          };
        }));
      }
    } catch (error) {
      console.error("❌ Error updating customer status:", error);
    }
  };

  const viewDetails = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const goBack = () => navigate('/admin');

  return (
    <div className="management-page">
      <button className="back-btn" onClick={goBack}>
        <span>←</span> {t('common.back', 'Back')}
      </button>

      <div className="management-header">
        <h1>{t('admin.customers.title', 'Customers Management')}</h1>
        <p>{t('admin.customers.subtitle', 'Monitor and manage customer accounts')}</p>
      </div>

      <div className="list-container">
        {error && <div className="warning-message">⚠️ {error}</div>}
        {loading && <div className="no-dealers"><p>{t('admin.customers.loading', 'Loading customers...')}</p></div>}
        {!loading && !customers.length && !error && <div className="no-dealers"><p>{t('admin.customers.noCustomers', 'No customers found')}</p></div>}
        {customers.map(customer => (
          <div key={customer.id || customer._id} className={`card ${customer.blocked ? 'blocked' : ''}`}>
            <div className="card-avatar">{customer.name.charAt(0)}</div>
            <div className="card-info">
              <h3>{customer.name}</h3>
              <p className="location">📍 {customer.location}</p>
              <p className="meta">{t('admin.customers.orders')}: {customer.orders} | {t('admin.customers.spent')}: ₹{customer.totalSpent}</p>
            </div>
            <div className="card-status">
              <span className={`badge ${customer.status.toLowerCase()}`}>
                {t(`admin.farmers.status${customer.status}`, customer.status)}
              </span>
            </div>
            <div className="card-actions">
              <button className="view-btn" onClick={() => viewDetails(customer)}>{t('admin.customers.view')}</button>
              <button 
                className={`toggle-btn ${customer.blocked ? 'unblock' : 'block'}`}
                onClick={() => toggleCustomerBlock(customer.id)}
              >
                {customer.blocked ? `🔓 ${t('admin.customers.unblock')}` : `🔒 ${t('admin.customers.block')}`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedCustomer && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCustomer.name}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <section className="info-section">
                <h3>{t('admin.customers.contactInfo')}</h3>
                <div className="info-rows">
                  <div className="info-row">
                    <label>{t('admin.customers.email')}</label>
                    <span>{selectedCustomer.email}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.customers.phone')}</label>
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.customers.address')}</label>
                    <span>{selectedCustomer.profile?.fullAddress || ""}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.customers.memberSince')}</label>
                    <span>{formatDate(selectedCustomer.joinDate)}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.customers.id')}</label>
                    <span>{selectedCustomer.id || selectedCustomer._id || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.customers.mandalDistrict')}</label>
                    <span>{[selectedCustomer.profile?.mandal, selectedCustomer.profile?.district].filter(Boolean).join(', ') || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.customers.statePincode')}</label>
                    <span>{[selectedCustomer.profile?.state, selectedCustomer.profile?.pincode].filter(Boolean).join(' - ') || 'N/A'}</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>{t('admin.customers.orderHistory')}</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-label">{t('admin.customers.orders')}</span>
                    <span className="stat-value">{selectedCustomer.orders}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">{t('admin.customers.totalSpent')}</span>
                    <span className="stat-value">₹{selectedCustomer.totalSpent}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">{t('admin.customers.lastOrder')}</span>
                    <span className="stat-value">{formatDate(selectedCustomer.lastOrder)}</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>{t('admin.customers.accountStatus')}</h3>
                <div className="status-display">
                  <span className={`large-badge ${selectedCustomer.status.toLowerCase()}`}>
                    {t(`admin.farmers.status${selectedCustomer.status}`, selectedCustomer.status)}
                  </span>
                </div>
              </section>
            </div>

            <div className="modal-footer">
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersManagement;
