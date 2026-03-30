import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPut } from "../utils/api";
import './styles/ManagementPages.css';

const ComplaintsSupport = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchComplaints = useCallback(async ({ silent = false } = {}) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setComplaints([]);
      setLoading(false);
      return;
    }

    if (silent) {
      setRefreshing(true);
    }

    try {
      const data = await apiGet('complaints');
      const nextComplaints = Array.isArray(data)
        ? data
        : Array.isArray(data?.complaints)
          ? data.complaints
          : [];

      setComplaints(nextComplaints);
      setSelectedComplaint((currentSelected) => {
        if (!currentSelected?._id) {
          return currentSelected;
        }

        return nextComplaints.find((complaint) => complaint._id === currentSelected._id) || currentSelected;
      });
    } catch (error) {
      console.error("❌ Error fetching complaints:", error);
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchComplaints();

    const intervalId = window.setInterval(() => {
      fetchComplaints({ silent: true });
    }, 10000);

    const handleWindowFocus = () => {
      fetchComplaints({ silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchComplaints({ silent: true });
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchComplaints]);

  const filteredComplaints = filterStatus === 'All'
    ? complaints
    : complaints.filter(c => c.status === filterStatus);

  const getComplaintDisplayId = (complaint) => complaint?.orderId?.id || complaint?._id || 'N/A';

  const getComplaintType = (complaint) => complaint?.orderId ? t('adminComplaints.orderComplaint', 'Order Complaint') : t('adminComplaints.generalSupport', 'General Support');

  const getComplainantName = (complaint) => (
    complaint?.customerId?.name || complaint?.customerId?.email || t('adminComplaints.unknownCustomer', 'Unknown customer')
  );

  const getOrderReference = (complaint) => {
    if (!complaint?.orderId) {
      return t('adminComplaints.notLinkedByOrder', 'Not linked to an order');
    }

    return complaint.orderId.id || complaint.orderId._id || t('adminComplaints.orderAvailable', 'Order available');
  };

  const getOrderAmount = (complaint) => {
    if (typeof complaint?.orderId?.total === 'number') {
      return complaint.orderId.total;
    }

    return null;
  };

  const formatComplaintDate = (value) => {
    if (!value) {
      return t('adminComplaints.notAvailable', 'Not available');
    }

    return new Date(value).toLocaleDateString();
  };

  const updateComplaintStatus = async (complaintId, newStatus, resolutionNotes) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const payload = {
        status: newStatus,
        ...(resolutionNotes ? { resolutionNotes } : {}),
      };
      const data = await apiPut(`complaints/${complaintId}/status`, payload);
      const updatedComplaint = data?.complaint;

      setComplaints(prev => prev.map(c =>
        c._id === complaintId ? { ...c, ...updatedComplaint } : c
      ));
      setSelectedComplaint(updatedComplaint || complaints.find(c => c._id === complaintId) || null);
      alert(t('adminComplaints.statusMarked', { defaultValue: 'Complaint marked as {{status}}', status: t(`support.status.${newStatus.toLowerCase()}`, newStatus) }));
    } catch (error) {
      console.error("Error updating complaint:", error);
      alert(t('adminComplaints.updateError', "Failed to update complaint status"));
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f97316';
      case 'Low': return '#eab308';
      default: return '#667eea';
    }
  };

  const viewComplaintDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setShowModal(true);
  };

  const goBack = () => navigate('/admin');

  return (
    <div className="management-page">
      <button className="back-btn" onClick={goBack}>
        <span>←</span> {t('common.back', 'Back')}
      </button>

      <div className="management-header">
        <h1>{t('adminComplaints.title', 'Complaints & Support')}</h1>
        <p>{t('adminComplaints.subtitle', 'Handle customer complaints and disputes')}</p>
        <button className="filter-btn" onClick={() => fetchComplaints({ silent: true })}>
          {refreshing ? t('common.refreshing', 'Refreshing...') : t('common.refresh', 'Refresh')}
        </button>
      </div>

      <div className="filter-section">
        <button 
          className={`filter-btn ${filterStatus === 'All' ? 'active' : ''}`}
          onClick={() => setFilterStatus('All')}
        >
          {t('common.all', 'All')} ({complaints.length})
        </button>
        <button 
          className={`filter-btn ${filterStatus === 'Open' ? 'active' : ''}`}
          onClick={() => setFilterStatus('Open')}
        >
          {t('support.open', 'Open')} ({complaints.filter(c => c.status === 'Open').length})
        </button>
        <button 
          className={`filter-btn ${filterStatus === 'Resolved' ? 'active' : ''}`}
          onClick={() => setFilterStatus('Resolved')}
        >
          {t('support.resolved', 'Resolved')} ({complaints.filter(c => c.status === 'Resolved').length})
        </button>
      </div>

      <div className="list-container">
        {filteredComplaints.map(complaint => (
          <div key={complaint._id} className={`card complaint-card ${complaint.status.toLowerCase()}`}>
            <div className="complaint-header">
              <div className="complaint-title">
                <h3>{t('adminComplaints.complaintNo', 'Complaint #')}{getComplaintDisplayId(complaint)}</h3>
                <p className="complaint-type">{getComplaintType(complaint)}</p>
              </div>
              <div className="severity-badge" style={{ background: getSeverityColor(complaint.severity) }}>
                {t(`common.${complaint.severity?.toLowerCase()}`, complaint.severity)}
              </div>
            </div>

            <div className="complaint-details">
              <p><strong>{t('adminComplaints.from', 'From')}:</strong> {getComplainantName(complaint)}</p>
              <p><strong>{t('common.order', 'Order')}:</strong> {getOrderReference(complaint)}</p>
              <p><strong>{t('adminComplaints.amount', 'Amount')}:</strong> {getOrderAmount(complaint) !== null ? `₹${getOrderAmount(complaint)}` : t('adminComplaints.notAvailable', 'Not available')}</p>
              <p className="description">{complaint.message}</p>
            </div>

            <div className="complaint-footer">
              <span className={`status-badge ${complaint.status.toLowerCase()}`}>{t(`support.status.${complaint.status?.toLowerCase()}`, complaint.status)}</span>
              <button 
                className="view-btn"
                onClick={() => viewComplaintDetails(complaint)}
              >
                {t('common.details', 'Details')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedComplaint && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('adminComplaints.complaintNo', 'Complaint #')}{getComplaintDisplayId(selectedComplaint)}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <section className="info-section">
                <h3>{t('adminComplaints.complaintDetails', 'Complaint Details')}</h3>
                <div className="info-rows">
                  <div className="info-row">
                    <label>{t('common.type', 'Type')}</label>
                    <span>{getComplaintType(selectedComplaint)}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('support.issueSeverity', 'Severity')}</label>
                    <span style={{ 
                      color: getSeverityColor(selectedComplaint.severity),
                      fontWeight: 'bold'
                    }}>
                      {t(`common.${selectedComplaint.severity?.toLowerCase()}`, selectedComplaint.severity)}
                    </span>
                  </div>
                  <div className="info-row">
                    <label>{t('adminComplaints.complainant', 'Complainant')}</label>
                    <span>{getComplainantName(selectedComplaint)}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('customerAccount.orderId', 'Order ID')}</label>
                    <span>{getOrderReference(selectedComplaint)}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('adminComplaints.filedOn', 'Filed On')}</label>
                    <span>{formatComplaintDate(selectedComplaint.createdAt)}</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>{t('adminComplaints.description', 'Description')}</h3>
                <p className="complaint-desc">{selectedComplaint.message}</p>
              </section>

              <section className="info-section">
                <h3>{t('adminComplaints.financialImpact', 'Financial Impact')}</h3>
                <div className="info-rows">
                  <div className="info-row">
                    <label>{t('common.orderAmount', 'Order Amount')}</label>
                    <span>{getOrderAmount(selectedComplaint) !== null ? `₹${getOrderAmount(selectedComplaint)}` : t('adminComplaints.notAvailable', 'Not available')}</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>{t('support.resolution', 'Resolution')}</h3>
                <div className="resolution-section">
                  {selectedComplaint.status === 'Resolved' ? (
                    <div className="resolution-text">
                      <p className="label">{t('adminComplaints.resolutionDetails', 'Resolution Details')}:</p>
                      <p>{selectedComplaint.resolutionNotes || t('adminComplaints.noNotes', 'No resolution notes added.')}</p>
                    </div>
                  ) : (
                    <div className="resolution-actions">
                      <p className="label">{t('adminComplaints.takeAction', 'Take Action')}:</p>
                      <div className="action-buttons">
                        <button 
                          className="action-approve"
                          onClick={() => updateComplaintStatus(selectedComplaint._id, 'Resolved')}
                        >
                          ✓ {t('adminComplaints.markAsResolved', 'Mark as Resolved')}
                        </button>
                        <button 
                          className="action-deny"
                          onClick={() => {
                            const msg = prompt(t('adminComplaints.enterResolutionPrompt', 'Enter resolution details:'));
                            if (msg) {
                              updateComplaintStatus(selectedComplaint._id, 'Resolved', msg);
                            }
                          }}
                        >
                          ✏️ {t('adminComplaints.addResolutionNotes', 'Add Resolution Notes')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="info-section">
                <h3>{t('common.status', 'Status')}</h3>
                <span className={`status-pill ${selectedComplaint.status.toLowerCase()}`} style={{
                  color: 'white',
                  display: 'inline-block'
                }}>
                  {t(`support.status.${selectedComplaint.status?.toLowerCase()}`, selectedComplaint.status)}
                </span>
              </section>
            </div>

            <div className="modal-footer">
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>{t('common.close', 'Close')}</button>
            </div>
          </div>
        </div>
      )}

      {!loading && filteredComplaints.length === 0 && (
        <div className="list-container">
          <div className="card">
            <p>{t('adminComplaints.noComplaintsFound', 'No complaints found for the selected filter.')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsSupport;
