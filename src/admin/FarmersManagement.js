import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "../utils/api";
import './styles/FarmersManagement.css';



const FarmersManagement = () => {
  const [farmers, setFarmers] = useState([]);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch farmers with their crops from backend
    const fetchFarmers = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        console.log('📍 Fetching farmers with crops...');
        const data = await apiGet('admin/farmers-with-crops');
        console.log('✅ Farmers with crops loaded:', data);
        if (Array.isArray(data)) {
          setFarmers(data);
        } else if (data?.farmers) {
          setFarmers(data.farmers);
        }
      } catch (error) {
        console.error("❌ Error fetching farmers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFarmers();
  }, []);

  const toggleFarmerStatus = async (farmerId) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const farmer = farmers.find(f => f._id === farmerId);
    const newStatus = farmer.status === 'active' ? 'blocked' : 'active';

    try {
      const updated = await apiPut(`admin/users/${farmerId}/status`, { status: newStatus });
      if (updated && updated.user) {
        setFarmers(prev => prev.map(f => f._id === farmerId ? updated.user : f));
      }
    } catch (error) {
      console.error("❌ Error updating farmer status:", error);
    }
  };

  const viewFarmerDetails = (farmer) => {
    setSelectedFarmer(farmer);
    setShowModal(true);
  };

  const goBack = () => navigate('/admin');

  return (
    <div className="farmers-management">
      <button className="back-btn" onClick={goBack}>
        <span>←</span> Back
      </button>

      <div className="management-header">
        <h1>Farmers Management</h1>
        <p>View and manage farmer accounts</p>
      </div>

      <div className="farmers-container">
        {loading ? (
          <div className="loading-state">⏳ Loading farmers...</div>
        ) : farmers.length === 0 ? (
          <div className="empty-state">No farmers registered yet</div>
        ) : (
          <div className="farmers-list">
            {farmers.map(farmer => (
              <div key={farmer._id} className="farmer-card">
                <div className="farmer-avatar">{farmer.name.charAt(0)}</div>
                <div className="farmer-info">
                  <h3>{farmer.name}</h3>
                  <p className="email">📧 {farmer.email}</p>
                  <p className="location">📍 {farmer.profile?.district || 'N/A'}, {farmer.profile?.state || 'N/A'}</p>
                  <p className="crops-count">🌾 {farmer.totalCrops || 0} total crops | {farmer.activeCrops || 0} active</p>
                </div>
                <div className="farmer-actions">
                  <button 
                    className="detail-btn"
                    onClick={() => viewFarmerDetails(farmer)}
                  >
                    View Details
                  </button>
                  <button 
                    className={`status-toggle ${farmer.status === 'active' ? 'enabled' : 'disabled'}`}
                    onClick={() => toggleFarmerStatus(farmer._id)}
                  >
                    {farmer.status === 'active' ? '✓ Active' : '✗ Blocked'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && selectedFarmer && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedFarmer.name}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <section className="profile-section">
                <h3>Profile Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Email</label>
                    <p>{selectedFarmer.email}</p>
                  </div>
                  <div className="info-item">
                    <label>Phone</label>
                    <p>{selectedFarmer.profile?.phone || 'Not provided'}</p>
                  </div>
                  <div className="info-item">
                    <label>Location</label>
                    <p>{selectedFarmer.profile?.district || 'N/A'}, {selectedFarmer.profile?.state || 'N/A'}</p>
                  </div>
                  <div className="info-item">
                    <label>Mandal</label>
                    <p>{selectedFarmer.profile?.mandal || 'N/A'}</p>
                  </div>
                  <div className="info-item">
                    <label>Pincode</label>
                    <p>{selectedFarmer.profile?.pincode || 'N/A'}</p>
                  </div>
                  <div className="info-item">
                    <label>Join Date</label>
                    <p>{new Date(selectedFarmer.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="info-item">
                    <label>Status</label>
                    <p className={`status-badge ${selectedFarmer.status.toLowerCase()}`}>
                      {selectedFarmer.status}
                    </p>
                  </div>
                </div>
              </section>

              <section className="crops-section">
                <h3>Crops Listed ({selectedFarmer.crops?.length || 0})</h3>
                {selectedFarmer.crops && selectedFarmer.crops.length > 0 ? (
                  <div className="crops-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Crop Name</th>
                          <th>Category</th>
                          <th>Quantity (kg)</th>
                          <th>Price/kg</th>
                          <th>Status</th>
                          <th>Added On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFarmer.crops.map((crop, idx) => (
                          <tr key={crop._id || idx}>
                            <td>{crop.cropName}</td>
                            <td>{crop.category}</td>
                            <td>{crop.availableQuantity}</td>
                            <td>₹{crop.pricePerKg}</td>
                            <td>
                              <span className={`status-indicator ${crop.isActive ? 'active' : 'inactive'}`}>
                                {crop.isActive && crop.status === 'listed' ? '🟢 Active' : '🔴 Inactive'}
                              </span>
                            </td>
                            <td>{new Date(crop.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-crops">No crops added yet</p>
                )}
              </section>

              <section className="stats-section">
                <h3>Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Total Crops</span>
                    <span className="stat-number">{selectedFarmer.totalCrops || 0}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Active Crops</span>
                    <span className="stat-number">{selectedFarmer.activeCrops || 0}</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="modal-footer">
              <button className="close-modal-btn" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmersManagement;
