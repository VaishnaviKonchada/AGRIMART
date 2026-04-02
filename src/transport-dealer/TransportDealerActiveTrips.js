import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/TransportDealerActiveTrips.css';
import TransportDealerBottomNav from './TransportDealerBottomNav';

const TransportDealerActiveTrips = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, completed: 0, efficiency: '94%' });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || userData.role !== 'transport-dealer') {
      navigate('/login');
      return;
    }
    fetchTrips(userData.id);
  }, [navigate]);

  const fetchTrips = async (dealerId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/transport-dealer/active-trips/${dealerId}`);
      if (response.ok) {
        const data = await response.json();
        setTrips(data.trips || []);
        setBatches(data.batches || []);
        setStats(prev => ({
          ...prev,
          active: data.trips?.filter(t => t.status === 'in-transit').length || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        const userData = JSON.parse(localStorage.getItem('user'));
        fetchTrips(userData.id);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'in-transit': return '🚚';
      case 'out-for-delivery': return '📦';
      case 'delivered': return '✅';
      default: return '📍';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'in-transit': return t("In Transit");
      case 'out-for-delivery': return t("Out for Delivery");
      case 'delivered': return t("Delivered");
      case 'pending': return t("Pending Delivery");
      default: return t(status);
    }
  };

  // Map orders to their batch information
  const orderBatchMap = useMemo(() => {
    const map = {};
    batches.forEach(batch => {
      (batch.stops || []).forEach(stop => {
        map[stop.orderId] = batch;
      });
    });
    return map;
  }, [batches]);

  return (
    <div className="transport-dealer-active-trips">
      {/* Header */}
      <div className="trips-header">
        <h2>{t("🚚 Active Trips")}</h2>
        <button className="back-btn" onClick={() => navigate("/transport-dealer-dashboard")}>{t("← Back")}</button>
      </div>

      {/* Stats */}
      <div className="trips-stats">
        <div className="stat-card">
          <div className="stat-icon">🚚</div>
          <div className="stat-info">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">{t("In Transit")}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">{t("Delivered Today")}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <div className="stat-value">{stats.efficiency}</div>
            <div className="stat-label">{t("Efficiency")}</div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="orders-section">
        <h3>{t("Currently In Transit")}</h3>
        {loading ? (
          <div className="loading-state">{t("Loading active trips...")}</div>
        ) : trips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚚</div>
            <p>{t("No active trips at the moment")}</p>
          </div>
        ) : (
          <div className="trips-list">
            {trips.map(trip => {
              const batch = orderBatchMap[trip.orderId];
              return (
                <div key={trip.id || trip.orderId} className={`trip-card ${trip.status}`}>
                  <div className="trip-header">
                    <span className="order-id">#{trip.orderId?.substring(0, 8)}</span>
                    <span className="batch-badge">{batch ? `${t("Batch")}: ${batch.batchId?.substring(0, 5)}` : t("Single Order")}</span>
                    <span className={`status-badge ${trip.status}`}>
                      {getStatusIcon(trip.status)} {getStatusLabel(trip.status)}
                    </span>
                  </div>

                  <div className="trip-content">
                    <div className="location-info">
                      <div className="loc-item">
                        <span className="dot start"></span>
                        <div className="details">
                          <label>{t("Pickup")}</label>
                          <p>{trip.pickupLocation}</p>
                        </div>
                      </div>
                      <div className="loc-item">
                        <span className="dot end"></span>
                        <div className="details">
                          <label>{t("Drop")}</label>
                          <p>{trip.dropLocation}</p>
                        </div>
                      </div>
                    </div>

                    <div className="cargo-details">
                      <div className="cargo-item">
                        <label>{t("Crop")}</label>
                        <p>{t(trip.cropName)}</p>
                      </div>
                      <div className="cargo-item">
                        <label>{t("Quantity")}</label>
                        <p>{trip.quantity} {t("kg")}</p>
                      </div>
                      <div className="cargo-item">
                        <label>{t("Vehicle")}</label>
                        <p>{trip.vehicleNumber || t("Assigned")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="trip-actions">
                    {trip.status === 'in-transit' && (
                      <button className="action-btn out-btn" onClick={() => updateStatus(trip.orderId, 'out-for-delivery')}>
                        📦 {t("Mark as Out for Delivery")}
                      </button>
                    )}
                    {trip.status === 'out-for-delivery' && (
                      <button className="action-btn deliver-btn" onClick={() => updateStatus(trip.orderId, 'delivered')}>
                        ✅ {t("Mark as Delivered")}
                      </button>
                    )}
                    <button className="action-btn chat-btn" onClick={() => navigate(`/transport-dealer/messages`)}>
                      💬 {t("Chat with Customer")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <TransportDealerBottomNav />
    </div>
  );
};

export default TransportDealerActiveTrips;