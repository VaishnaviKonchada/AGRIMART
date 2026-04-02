import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet } from "../utils/api";
import './styles/ManagementPages.css';



const PaymentsSettlements = () => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPayout: 0,
    platformCommission: 0,
    pendingSettlement: 0,
    completedPayments: 0
  });
  const navigate = useNavigate();
  const getOrderId = (order) => order.orderId || order.id || order._id || '-';
  const getOrderDate = (order) => order.createdAt || order.completedAt || order.acceptedAt || order.date;
  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
  };
  const getOrderAmount = (order) => {
    const total = Number(order.summary?.total ?? order.total ?? order.amount);
    return Number.isFinite(total) ? total : 0;
  };
  const getPlatformFee = (order) => {
    const fee = Number(order.summary?.platformFee ?? order.platformFee);
    if (Number.isFinite(fee)) return fee;
    const itemsTotal = Number(order.summary?.itemsTotal || 0);
    return Math.min(Math.round(itemsTotal * 0.02), 100);
  };
  const getDealerEarnings = (order) => {
    const agreed = Number(order.agreedPrice);
    if (Number.isFinite(agreed)) return agreed;
    const transport = Number(order.transport?.price);
    if (Number.isFinite(transport)) return transport;
    return 0;
  };
  const getDealerName = (order) => order.dealerName || order.transport?.dealerName || order.dealerId?.name || '-';
  const isValidOrder = (order) => {
    const orderId = String(order?.orderId || '').trim();
    const amount = getOrderAmount(order);
    const hasItems = Array.isArray(order?.items) && order.items.length > 0;
    const hasCustomer = Boolean(order?.customerName || order?.customerId);
    return Boolean(orderId) && amount > 0 && hasItems && hasCustomer;
  };

  useEffect(() => {
    // Fetch orders from backend to calculate payment stats
    const fetchPayments = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const orders = await apiGet('orders');
        if (Array.isArray(orders)) {
          const validOrders = orders.filter(isValidOrder);
          setPayments(validOrders);

          // Calculate stats from real backend data
          let totalPayout = 0;
          let platformCommission = 0;
          let completed = 0;

          validOrders.forEach(order => {
            const amount = getOrderAmount(order);
            totalPayout += amount;
            platformCommission += getPlatformFee(order);
            if (order.status === 'Delivered') completed++;
          });

          setStats({
            totalPayout,
            platformCommission: Math.round(platformCommission),
            pendingSettlement: validOrders.length - completed,
            completedPayments: completed
          });
        }
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const viewPaymentDetails = (payment) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  const goBack = () => navigate('/admin');

  return (
    <div className="management-page">
      <button className="back-btn" onClick={goBack}>
        <span>←</span> {t('admin.reports.back')}
      </button>

      <div className="management-header">
        <h1>{t('admin.payments.title')}</h1>
        <p>{t('admin.payments.subtitle')}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Payouts</span>
          <span className="stat-value">₹{stats.totalPayout}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t('admin.payments.platformCommission')}</span>
          <span className="stat-value">₹{stats.platformCommission}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t('admin.payments.pendingSettlements')}</span>
          <span className="stat-value">{stats.pendingSettlement}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t('admin.payments.completedPayments')}</span>
          <span className="stat-value">{stats.completedPayments}</span>
        </div>
      </div>

      <div className="payments-table-container">
        <table className="payments-table">
          <thead>
            <tr>
              <th>{t('admin.payments.orderId')}</th>
              <th>{t('admin.payments.dealer')}</th>
              <th>{t('admin.payments.orderAmount')}</th>
              <th>{t('admin.payments.platformFeeLabel')}</th>
              <th>{t('admin.payments.dealerEarnings')}</th>
              <th>{t('admin.payments.status')}</th>
              <th>{t('admin.payments.date')}</th>
              <th>{t('admin.payments.action')}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => {
              const fee = getPlatformFee(payment);
              const dealerEarnings = getDealerEarnings(payment);
              const amount = getOrderAmount(payment);

              return (
                <tr key={payment._id || payment.orderId || payment.id}>
                  <td><strong>#{getOrderId(payment)}</strong></td>
                  <td>{getDealerName(payment)}</td>
                  <td>₹{amount.toLocaleString()}</td>
                  <td>₹{fee}</td>
                  <td><strong>₹{dealerEarnings.toLocaleString()}</strong></td>
                  <td>
                    <span className="status-pill" style={{
                      background: payment.status === 'Delivered' ? '#22c55e' : '#f97316',
                      color: 'white'
                    }}>
                      {payment.status === 'Delivered' ? t('admin.payments.completed') : t('admin.payments.pending')}
                    </span>
                  </td>
                  <td>{formatDate(getOrderDate(payment))}</td>
                  <td>
                    <button
                      className="action-btn"
                      onClick={() => viewPaymentDetails(payment)}
                    >
                      {t('admin.payments.view')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('admin.payments.paymentDetails')}{getOrderId(selectedPayment)}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <section className="info-section">
                <h3>{t('admin.payments.orderInfo')}</h3>
                <div className="info-rows">
                  <div className="info-row">
                    <label>{t('admin.payments.orderId')}</label>
                    <span>#{getOrderId(selectedPayment)}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.payments.dealerName')}</label>
                    <span>{getDealerName(selectedPayment)}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.payments.orderDate')}</label>
                    <span>{formatDate(getOrderDate(selectedPayment))}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.payments.orderStatus')}</label>
                    <span className="status-pill" style={{
                      background: selectedPayment.status === 'Delivered' ? '#22c55e' : '#f97316',
                      color: 'white',
                      display: 'inline-block'
                    }}>
                      {selectedPayment.status}
                    </span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>{t('admin.payments.paymentBreakdown')}</h3>
                <div className="payment-breakdown">
                  <div className="breakdown-row">
                    <span>{t('admin.payments.orderAmountLabel')}</span>
                    <span className="amount">₹{getOrderAmount(selectedPayment).toLocaleString()}</span>
                  </div>
                  <div className="breakdown-row">
                    <span>{t('admin.payments.platformFeeBreakdown')}</span>
                    <span className="amount">₹{getPlatformFee(selectedPayment).toLocaleString()}</span>
                  </div>
                  <div className="breakdown-row total">
                    <span>{t('admin.payments.dealerEarningsLabel')}</span>
                    <span className="amount">₹{getDealerEarnings(selectedPayment).toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {selectedPayment.requestDetails && (
                <section className="info-section">
                  <h3>{t('admin.payments.routeDetails')}</h3>
                  <div className="info-rows">
                    <div className="info-row">
                      <label>{t('admin.payments.pickup')}</label>
                      <span>{selectedPayment.requestDetails.pickupLocation}</span>
                    </div>
                    <div className="info-row">
                      <label>{t('admin.payments.delivery')}</label>
                      <span>{selectedPayment.requestDetails.deliveryLocation}</span>
                    </div>
                  </div>
                </section>
              )}

              <section className="info-section">
                <h3>{t('admin.payments.settlementStatus')}</h3>
                <div className="settlement-status">
                  {selectedPayment.status === 'Delivered' ? (
                    <p className="success-msg">{t('admin.payments.paymentCompleted')}</p>
                  ) : (
                    <p className="pending-msg">{t('admin.payments.paymentPending')}</p>
                  )}
                </div>
              </section>
            </div>

            <div className="modal-footer">
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>{t('admin.payments.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsSettlements;
