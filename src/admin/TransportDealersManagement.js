import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPut } from "../utils/api";
import './styles/ManagementPages.css';

const TransportDealersManagement = () => {
  const { t } = useTranslation();
  const [dealers, setDealers] = useState([]);
  const [selectedDealer, setSelectedDealer] = useState(null);
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
    const normalizeDealer = (dealer) => {
      const location = dealer?.location || dealer?.profile?.locationText || [dealer?.profile?.mandal, dealer?.profile?.district, dealer?.profile?.state].filter(Boolean).join(', ') || 'N/A';
      const statusValue = String(dealer?.status || 'active');
      const profile = dealer?.profile || {};
      return {
        ...dealer,
        id: dealer?.id || dealer?._id,
        name: dealer?.name || 'Dealer',
        email: dealer?.email || 'N/A',
        phone: dealer?.phone || dealer?.profile?.phone || 'N/A',
        profile,
        location,
        joinDate: dealer?.joinDate || dealer?.createdAt || new Date().toISOString(),
        vehicles: Array.isArray(dealer?.vehicles) ? dealer.vehicles : [],
        completedTrips: Number(dealer?.completedTrips || 0),
        rating: Number(dealer?.rating || 0),
        totalEarnings: Number(dealer?.totalEarnings || 0),
        enabled: statusValue.toLowerCase() === 'active',
        status: statusValue.charAt(0).toUpperCase() + statusValue.slice(1).toLowerCase(),
      };
    };

    const fetchDealers = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiGet("admin/dealers-summary");
        if (data && Array.isArray(data)) {
          setDealers(data.map(normalizeDealer));
        } else if (data?.users) {
          setDealers(data.users.map(normalizeDealer));
        }
      } catch (error) {
        setError(t('admin.dealers.noDealers'));
      } finally {
        setLoading(false);
      }
    };

    fetchDealers();
  }, [t]);

  const toggleDealerStatus = async (dealerId) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const dealer = dealers.find(d => d._id === dealerId || d.id === dealerId);
    if (!dealer) return;
    const currentStatus = String(dealer?.status || '').toLowerCase();
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';

    try {
      const updated = await apiPut(`admin/users/${dealerId}/status`, { status: newStatus });
      if (updated && updated.user) {
        const normalized = String(updated.user.status || 'active');
        setDealers(prev => prev.map(d => {
          if (!(d._id === dealerId || d.id === dealerId)) return d;
          return {
            ...d,
            ...updated.user,
            status: normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase(),
            enabled: normalized.toLowerCase() === 'active',
          };
        }));
      }
    } catch (error) {
      console.error("❌ Error updating dealer status:", error);
    }
  };

  const approvePendingDealer = async (dealerId) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const updated = await apiPut(`admin/users/${dealerId}/status`, { status: 'active' });
      if (updated && updated.user) {
        setDealers(prev => prev.map(d => {
          if (!(d._id === dealerId || d.id === dealerId)) return d;
          return {
            ...d,
            ...updated.user,
            status: 'Active',
            enabled: true,
          };
        }));
      }
    } catch (error) {
      console.error("❌ Error approving dealer:", error);
    }
  };

  const viewDetails = (dealer) => {
    setSelectedDealer(dealer);
    setShowModal(true);
  };

  const goBack = () => navigate('/admin');

  return (
    <div className="management-page">
      <div className="list-container">
        {error && <div className="warning-message">⚠️ {error}</div>}
        {loading && <div className="no-dealers"><p>{t('admin.dealers.loading', 'Loading dealers...')}</p></div>}
        {!loading && !dealers.length && !error && <div className="no-dealers"><p>{t('admin.dealers.noDealers', 'No dealers found')}</p></div>}
        {dealers.map(dealer => (
          <div key={dealer.id || dealer._id} className={`card ${!dealer.enabled ? 'inactive' : ''}`}>
            <div className="card-avatar" style={{ background: dealer.status === 'Pending' ? '#f97316' : '#166534' }}>
              {dealer.name.charAt(0)}
            </div>
            <div className="card-info">
              <h3>{dealer.name}</h3>
              <p className="location">📍 {dealer.location}</p>
              <p className="meta">{t('admin.dealers.trips')}: {dealer.completedTrips}</p>
            </div>
            <div className="card-status">
              <span className={`badge ${dealer.status.toLowerCase()}`}>
                {t(`admin.farmers.status${dealer.status}`, dealer.status)}
              </span>
            </div>
            <div className="card-actions">
              <button className="view-btn" onClick={() => viewDetails(dealer)}>{t('admin.customers.view')}</button>
              {dealer.status === 'Pending' ? (
                <button className="approve-btn" onClick={() => approvePendingDealer(dealer.id)}>
                  ✓ {t('admin.dealers.approve')}
                </button>
              ) : (
                <button 
                  className={`toggle-btn ${!dealer.enabled ? 'enable' : 'disable'}`}
                  onClick={() => toggleDealerStatus(dealer.id)}
                >
                  {dealer.enabled ? `⊘ ${t('admin.dealers.suspend')}` : `✓ ${t('admin.dealers.enable')}`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedDealer && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedDealer.name}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <section className="info-section">
                <h3>{t('admin.dealers.businessInfo')}</h3>
                <div className="info-rows">
                  <div className="info-row">
                    <label>{t('admin.customers.email')}</label>
                    <span>{selectedDealer.email}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.customers.phone')}</label>
                    <span>{selectedDealer.phone}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('customerAccount.location')}</label>
                    <span>{selectedDealer.location}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.customers.memberSince')}</label>
                    <span>{formatDate(selectedDealer.joinDate)}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.dealers.id')}</label>
                    <span>{selectedDealer.id || selectedDealer._id || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.customers.mandalDistrict')}</label>
                    <span>{[selectedDealer.profile?.mandal, selectedDealer.profile?.district].filter(Boolean).join(', ') || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.customers.statePincode')}</label>
                    <span>{[selectedDealer.profile?.state, selectedDealer.profile?.pincode].filter(Boolean).join(' - ') || 'N/A'}</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>{t('admin.dealers.fleetPerformance')}</h3>
                <div className="info-rows">
                  <div className="info-row">
                    <label>{t('admin.dealers.vehicles')}</label>
                    <span>{selectedDealer.vehicles.length ? selectedDealer.vehicles.join(', ') : 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.dealers.completedTrips')}</label>
                    <span>{selectedDealer.completedTrips}</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>{t('admin.dealers.financialSummary')}</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-label">{t('admin.dealers.totalEarnings')}</span>
                    <span className="stat-value">₹{selectedDealer.totalEarnings}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">{t('admin.customers.accountStatus')}</span>
                    <span className={`status-badge ${selectedDealer.status.toLowerCase()}`}>
                      {t(`admin.farmers.status${selectedDealer.status}`, selectedDealer.status)}
                    </span>
                  </div>
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

export default TransportDealersManagement;
