import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet } from "../utils/api";
import './styles/ManagementPages.css';



const OrdersMonitoring = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch all orders from backend
    const fetchOrders = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiGet('orders');
        if (Array.isArray(data)) {
          setOrders(data.filter(isValidOrder));
        }
      } catch (error) {
        console.error("❌ Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const filteredOrders = filterStatus === 'All'
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#f97316';
      case 'Confirmed': return '#3b82f6';
      case 'Accepted': return '#0ea5e9';
      case 'In Transit': return '#8b5cf6';
      case 'Delivered': return '#22c55e';
      case 'Cancelled': return '#ef4444';
      default: return '#667eea';
    }
  };

  const getOrderId = (order) => order.orderId || order.id || order._id || '-';
  const getOrderDate = (order) => order.createdAt || order.completedAt || order.acceptedAt || order.date;
  const getAmount = (order) => {
    const total = Number(order.summary?.total);
    if (Number.isFinite(total)) return total;
    const fallback = Number(order.total);
    return Number.isFinite(fallback) ? fallback : 0;
  };
  const getPlatformFee = (order) => {
    const fee = Number(order.summary?.platformFee ?? order.platformFee);
    if (Number.isFinite(fee)) return fee;
    const itemsTotal = Number(order.summary?.itemsTotal || 0);
    return Math.min(Math.round(itemsTotal * 0.02), 100);
  };
  const getDealerPrice = (order) => {
    const agreed = Number(order.agreedPrice);
    if (Number.isFinite(agreed)) return agreed;
    const transport = Number(order.transport?.price);
    return Number.isFinite(transport) ? transport : 0;
  };
  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
  };
  const getCustomerName = (order) => order.customerName || order.customerId?.name || '-';
  const getFarmerName = (order) => order.farmerName || order.farmerId?.name || '-';
  const getDealerName = (order) => order.dealerName || order.transport?.dealerName || order.dealerId?.name || '-';
  const isValidOrder = (order) => {
    const orderId = String(order?.orderId || '').trim();
    const amount = getAmount(order);
    const hasItems = Array.isArray(order?.items) && order.items.length > 0;
    const hasCustomer = Boolean(order?.customerName || order?.customerId);
    return Boolean(orderId) && amount > 0 && hasItems && hasCustomer;
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const goBack = () => navigate('/admin');

  return (
    <div className="management-page">
      <button className="back-btn" onClick={goBack}>
        <span>←</span> {t('admin.reports.back')}
      </button>

      <div className="management-header">
        <h1>{t('admin.orders.title')}</h1>
        <p>{t('admin.orders.subtitle')}</p>
      </div>

      <div className="filter-section">
        <button
          className={`filter-btn ${filterStatus === 'All' ? 'active' : ''}`}
          onClick={() => setFilterStatus('All')}
        >
          {t('admin.orders.allOrders')}
        </button>
        {['Pending', 'Confirmed', 'Accepted', 'In Transit', 'Delivered', 'Cancelled'].map(status => (
          <button
            key={status}
            className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
            onClick={() => setFilterStatus(status)}
          >
            {t(`admin.orders.statusKeys.${status}`, status)}
          </button>
        ))}
      </div>

      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>{t('admin.orders.orderId')}</th>
              <th>{t('admin.orders.farmer')}</th>
              <th>{t('admin.orders.customer')}</th>
              <th>{t('admin.orders.dealer')}</th>
              <th>{t('admin.orders.amount')}</th>
              <th>{t('admin.orders.adminFee')}</th>
              <th>{t('admin.orders.status')}</th>
              <th>{t('admin.orders.date')}</th>
              <th>{t('admin.orders.action')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order._id || order.orderId || order.id}>
                <td><strong>#{getOrderId(order)}</strong></td>
                <td>{getFarmerName(order)}</td>
                <td>{getCustomerName(order)}</td>
                <td>{getDealerName(order)}</td>
                <td>₹{getAmount(order).toLocaleString()}</td>
                <td>₹{getPlatformFee(order).toLocaleString()}</td>
                <td>
                  <span className="status-pill" style={{
                    background: getStatusColor(order.status),
                    color: 'white'
                  }}>
                      {t(`admin.orders.statusKeys.${order.status}`, order.status)}
                  </span>
                </td>
                <td>{formatDate(getOrderDate(order))}</td>
                <td>
                  <button
                    className="action-btn"
                    onClick={() => viewOrderDetails(order)}
                  >
                    {t('admin.orders.view')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('admin.orders.orderDetails')} #{getOrderId(selectedOrder)}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <section className="info-section">
                <h3>{t('admin.orders.orderDetails')}</h3>
                <div className="info-rows">
                  <div className="info-row">
                    <label>{t('admin.orders.orderId')}</label>
                    <span>#{getOrderId(selectedOrder)}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.status')}</label>
                    <span
                      className="status-pill"
                      style={{
                        background: getStatusColor(selectedOrder.status),
                        color: 'white',
                        display: 'inline-block'
                      }}
                    >
                      {t(`admin.orders.statusKeys.${selectedOrder.status}`, selectedOrder.status)}
                    </span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.orderDate')}</label>
                    <span>{formatDate(getOrderDate(selectedOrder))}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.totalAmount')}</label>
                    <span>₹{getAmount(selectedOrder).toLocaleString()}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.adminPlatformFee')}</label>
                    <span>₹{getPlatformFee(selectedOrder).toLocaleString()}</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>{t('admin.orders.partiesInvolved')}</h3>
                <div className="info-rows">
                  <div className="info-row">
                    <label>{t('admin.orders.customerName')}</label>
                    <span>{getCustomerName(selectedOrder)}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.customerPhone')}</label>
                    <span>{selectedOrder.delivery?.dropPhone || selectedOrder.customerSnapshot?.phone || selectedOrder.customerId?.profile?.phone || '-'}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.customerId')}</label>
                    <span>{String(selectedOrder.customerId?._id || selectedOrder.customerId || '-')}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.farmerName')}</label>
                    <span>{getFarmerName(selectedOrder)}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.farmerId')}</label>
                    <span>{String(selectedOrder.farmerId?._id || selectedOrder.farmerId || '-')}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.transportDealer')}</label>
                    <span>{getDealerName(selectedOrder)}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.dealerId')}</label>
                    <span>{String(selectedOrder.dealerId?._id || selectedOrder.dealerId || selectedOrder.transport?.dealerId || '-')}</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>{t('admin.orders.deliveryRoute')}</h3>
                <div className="info-rows">
                  <div className="info-row">
                    <label>{t('admin.orders.pickupLocation')}</label>
                    <span>{selectedOrder.delivery?.pickup || '-'}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.deliveryLocation')}</label>
                    <span>{selectedOrder.delivery?.drop || '-'}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.dropAddress')}</label>
                    <span>{selectedOrder.delivery?.dropLocationText || selectedOrder.customerSnapshot?.locationText || '-'}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.doorNo')}</label>
                    <span>{selectedOrder.delivery?.dropDoorNo || selectedOrder.customerSnapshot?.doorNo || '-'}</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h3>{t('admin.orders.cargoDetails')}</h3>
                <div className="info-rows">
                  <div className="info-row">
                    <label>{t('admin.orders.cropName')}</label>
                    <span>{selectedOrder.items?.[0]?.cropName || '-'}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.quantity')}</label>
                    <span>{selectedOrder.items?.[0]?.quantity || 0} kg</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.vehicleType')}</label>
                    <span>{selectedOrder.transport?.vehicle || '-'}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.farmerReceives')}</label>
                    <span>₹{(selectedOrder.summary?.itemsTotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="info-row">
                    <label>{t('admin.orders.dealerPrice')}</label>
                    <span>₹{getDealerPrice(selectedOrder).toLocaleString()}</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="modal-footer">
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>{t('admin.orders.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersMonitoring;
