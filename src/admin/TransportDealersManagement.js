import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "../utils/api";
import './styles/ManagementPages.css';



const TransportDealersManagement = () => {
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

    // Fetch transport dealers from backend
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
        console.error("❌ Error fetching dealers summary, trying fallback:", error);
        try {
          const fallback = await apiGet("admin/users?role=dealer");
          if (Array.isArray(fallback)) {
            setDealers(fallback.map(normalizeDealer));
          } else if (fallback?.users) {
            setDealers(fallback.users.map(normalizeDealer));
          } else {
            setError('Failed to load dealer data');
          }
        } catch (fallbackError) {
          console.error("❌ Fallback dealer fetch failed:", fallbackError);
          setError('Failed to load dealer data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDealers();
  }, []);

  const toggleDealerStatus = async (dealerId) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const dealer = dealers.find(d => d._id === dealerId || d.id === dealerId);
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
      <button className="back-btn" onClick={goBack}>
        <span>←</span> Back
      </button>

      <div className="management-header">
        <h1>Transport Dealers Management</h1>
        <p>Approve and manage transport dealers</p>
      </div>

      <div className="list-container">
        {error && <div className="warning-message">⚠️ {error}</div>}
        {loading && <div className="no-dealers"><p>Loading dealers...</p></div>}
        {!loading && !dealers.length && !error && <div className="no-dealers"><p>No dealers found</p></div>}
        {dealers.map(dealer => (
          <div key={dealer.id || dealer._id} className={`card ${!dealer.enabled ? 'inactive' : ''}`}>
            <div className="card-avatar" style={{ background: dealer.status === 'Pending' ? '#f97316' : '#667eea' }}>
              {dealer.name.charAt(0)}
            </div>
            <div className="card-info">
              <h3>{dealer.name}</h3>
              <p className="location">📍 {dealer.location}</p>
              <p className="meta">Trips: {dealer.completedTrips}</p>
            </div>
            <div className="card-status">
              <span className={`badge ${dealer.status.toLowerCase()}`}>{dealer.status}</span>
            </div>
            <div className="card-actions">
              <button className="view-btn" onClick={() => viewDetails(dealer)}>View</button>
              {dealer.status === 'Pending' ? (
                <button className="approve-btn" onClick={() => approvePendingDealer(dealer.id)}>
                  ✓ Approve
                </button>
              ) : (
                <button 
                  className={`toggle-btn ${!dealer.enabled ? 'enable' : 'disable'}`}
                  onClick={() => toggleDealerStatus(dealer.id)}
                >
                  {dealer.enabled ? '⊘ Suspend' : '✓ Enable'}
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
                <h3>Business Information</h3>
                <div className="info-rows">
                  <div className="info-row">
                    <label>Email</label>
                    <span>{selectedDealer.email}</span>
                  </div>
                  <div className="info-row">
                    <label>Phone</label>
                    <span>{selectedDealer.phone}</span>
                  </div>
                  <div className="info-row">
                    <label>Location</label>
                    <span>{selectedDealer.location}</span>
                  </div>
                  <div className="info-row">
                    <label>Join Date</label>
                    <span>{formatDate(selectedDealer.joinDate)}</span>
                  </div>
                  <div className="info-row">
                    <label>Dealer ID</label>
                    <span>{selectedDealer.id || selectedDealer._id || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <label>Mandal / District</label>
                    <span>{[selectedDealer.profile?.mandal, selectedDealer.profile?.district].filter(Boolean).join(', ') || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <label>State / Pincode</label>
                    <span>{[selectedDealer.profile?.state, selectedDealer.profile?.pincode].filter(Boolean).join(' - ') || 'N/A'}</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>Fleet & Performance</h3>
                <div className="info-rows">
                  <div className="info-row">
                    <label>Vehicles</label>
                    <span>{selectedDealer.vehicles.length ? selectedDealer.vehicles.join(', ') : 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <label>Completed Trips</label>
                    <span>{selectedDealer.completedTrips}</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>Financial Summary</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-label">Total Earnings</span>
                    <span className="stat-value">₹{selectedDealer.totalEarnings}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Account Status</span>
                    <span className={`status-badge ${selectedDealer.status.toLowerCase()}`}>
                      {selectedDealer.status}
                    </span>
                  </div>
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

export default TransportDealersManagement;
