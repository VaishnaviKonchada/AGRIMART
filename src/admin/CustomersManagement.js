import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "../utils/api";
import './styles/ManagementPages.css';



const CustomersManagement = () => {
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

    // Fetch customers from backend
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
        console.error("❌ Error fetching customer summary, trying fallback:", error);
        try {
          const fallback = await apiGet('admin/users?role=customer');
          if (Array.isArray(fallback)) {
            setCustomers(fallback.map(normalizeCustomer));
          } else if (fallback?.users) {
            setCustomers(fallback.users.map(normalizeCustomer));
          } else {
            setError('Failed to load customer data');
          }
        } catch (fallbackError) {
          console.error('❌ Fallback customer fetch failed:', fallbackError);
          setError('Failed to load customer data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

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
        <span>←</span> Back
      </button>

      <div className="management-header">
        <h1>Customers Management</h1>
        <p>Monitor and manage customer accounts</p>
      </div>

      <div className="list-container">
        {error && <div className="warning-message">⚠️ {error}</div>}
        {loading && <div className="no-dealers"><p>Loading customers...</p></div>}
        {!loading && !customers.length && !error && <div className="no-dealers"><p>No customers found</p></div>}
        {customers.map(customer => (
          <div key={customer.id || customer._id} className={`card ${customer.blocked ? 'blocked' : ''}`}>
            <div className="card-avatar">{customer.name.charAt(0)}</div>
            <div className="card-info">
              <h3>{customer.name}</h3>
              <p className="location">📍 {customer.location}</p>
              <p className="meta">Orders: {customer.orders} | Spent: ₹{customer.totalSpent}</p>
            </div>
            <div className="card-status">
              <span className={`badge ${customer.status.toLowerCase()}`}>{customer.status}</span>
            </div>
            <div className="card-actions">
              <button className="view-btn" onClick={() => viewDetails(customer)}>View</button>
              <button 
                className={`toggle-btn ${customer.blocked ? 'unblock' : 'block'}`}
                onClick={() => toggleCustomerBlock(customer.id)}
              >
                {customer.blocked ? '🔓 Unblock' : '🔒 Block'}
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
                <h3>Contact Information</h3>
                <div className="info-rows">
                  <div className="info-row">
                    <label>Email</label>
                    <span>{selectedCustomer.email}</span>
                  </div>
                  <div className="info-row">
                    <label>Phone</label>
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  <div className="info-row">
                    <label>Full Address</label>
                    <span>{selectedCustomer.profile?.fullAddress && String(selectedCustomer.profile.fullAddress).trim().length > 0 ? String(selectedCustomer.profile.fullAddress).trim() : ""}</span>
                  </div>
                  <div className="info-row">
                    <label>Member Since</label>
                    <span>{formatDate(selectedCustomer.joinDate)}</span>
                  </div>
                  <div className="info-row">
                    <label>Customer ID</label>
                    <span>{selectedCustomer.id || selectedCustomer._id || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <label>Mandal / District</label>
                    <span>{[selectedCustomer.profile?.mandal, selectedCustomer.profile?.district].filter(Boolean).join(', ') || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <label>State / Pincode</label>
                    <span>{[selectedCustomer.profile?.state, selectedCustomer.profile?.pincode].filter(Boolean).join(' - ') || 'N/A'}</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>Order History</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-label">Total Orders</span>
                    <span className="stat-value">{selectedCustomer.orders}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Total Spent</span>
                    <span className="stat-value">₹{selectedCustomer.totalSpent}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Last Order</span>
                    <span className="stat-value">{formatDate(selectedCustomer.lastOrder)}</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>Account Status</h3>
                <div className="status-display">
                  <span className={`large-badge ${selectedCustomer.status.toLowerCase()}`}>
                    {selectedCustomer.status}
                  </span>
                </div>
              </section>
            </div>

            <div className="modal-footer">
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersManagement;
