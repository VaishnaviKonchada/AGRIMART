import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../utils/api";
import "../styles/SupportChat.css";

const COMPLAINT_CONFIG = {
  customer: {
    label: "Customer",
    intro: "Raise order, delivery, billing, or quality issues directly to admin for review and support.",
    backPath: "/account",
    categories: ["Orders", "Delivery", "Payment", "Quality", "Account"],
    templates: [
      { id: "customer-order-delay", category: "Delivery", title: "Order delayed beyond expected time", prompt: "Share the order, expected delivery time, and what went wrong." },
      { id: "customer-damaged-items", category: "Quality", title: "Damaged or spoiled products received", prompt: "Describe product condition, quantity affected, and what action you want admin to review." },
      { id: "customer-payment", category: "Payment", title: "Payment deducted but order not confirmed", prompt: "Explain the payment method used, the order reference, and what the app showed after payment." },
      { id: "customer-billing", category: "Payment", title: "Need billing or charge clarification", prompt: "Describe the charge or amount you want admin to verify and why it looks incorrect to you." },
      { id: "customer-address", category: "Account", title: "Delivery address or profile issue", prompt: "Describe the address or account problem clearly." },
      { id: "customer-service", category: "Orders", title: "Issue with farmer or transport service", prompt: "Explain the service issue and when it happened." },
    ],
  },
  farmer: {
    label: "Farmer",
    intro: "Report crop listing, order handling, payout, or account issues to admin.",
    backPath: "/farmer/account",
    categories: ["Crop Listing", "Orders", "Payments", "Transport", "Account", "Buyer Issues"],
    templates: [
      { id: "farmer-listing", category: "Crop Listing", title: "Crop listing not visible to buyers", prompt: "Mention the crop name, when you listed it, and what visibility problem you noticed." },
      { id: "farmer-payment", category: "Payments", title: "Farmer payout delayed or incorrect", prompt: "Share the affected order and expected payout amount." },
      { id: "farmer-order-status", category: "Orders", title: "Order status is wrong or stuck", prompt: "Explain which order is affected and what the correct status should be." },
      { id: "farmer-transport", category: "Transport", title: "Transport pickup issue for order", prompt: "Describe the pickup delay, missed assignment, or delivery coordination problem." },
      { id: "farmer-account", category: "Account", title: "Farmer account verification/profile issue", prompt: "Explain what is blocked in your account or profile." },
      { id: "farmer-buyer", category: "Buyer Issues", title: "Buyer dispute or unfair complaint", prompt: "Provide the buyer-side issue from your perspective and any supporting details." },
    ],
  },
  "transport dealer": {
    label: "Transport Dealer",
    intro: "Report assignment, trip, vehicle verification, payment, or service-area issues to admin.",
    backPath: "/transport-dealer/account",
    categories: ["Assignments", "Trips", "Payments", "Vehicles", "Service Area", "Account"],
    templates: [
      { id: "dealer-assignment", category: "Assignments", title: "Order assignment issue", prompt: "Describe the order assignment problem, such as missing jobs or incorrect allocation." },
      { id: "dealer-trip", category: "Trips", title: "Trip status or delivery workflow issue", prompt: "Explain what happened during the trip and what needs admin intervention." },
      { id: "dealer-payment", category: "Payments", title: "Transport payment delayed or incorrect", prompt: "Share the order reference and the expected transport amount." },
      { id: "dealer-vehicle", category: "Vehicles", title: "Vehicle verification or approval problem", prompt: "Mention the vehicle and what verification issue is blocking operations." },
      { id: "dealer-area", category: "Service Area", title: "Service area/location mapping issue", prompt: "Describe which service area is wrong or missing." },
      { id: "dealer-account", category: "Account", title: "Dealer profile or login issue", prompt: "Explain the profile, access, or account problem you are facing." },
    ],
  },
};

const normalizeRole = (role) => {
  const normalizedRole = String(role || "").toLowerCase().trim();
  if (normalizedRole === "dealer") {
    return "transport dealer";
  }

  if (normalizedRole === "transport dealer") {
    return "transport dealer";
  }

  if (normalizedRole === "farmer") {
    return "farmer";
  }

  return "customer";
};

const getOrderLabel = (order) => order?.orderId || order?.id || order?._id || "Order";

const formatComplaintDate = (value) => {
  if (!value) {
    return "Just now";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function SupportChat() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("customer");
  const [complaints, setComplaints] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [relatedOrderId, setRelatedOrderId] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [customMessage, setCustomMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resolutionAlert, setResolutionAlert] = useState(null);
  const previousComplaintsRef = useRef([]);

  const fetchComplaints = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    }

    try {
      const complaintsData = await apiGet("complaints");
      const nextComplaints = Array.isArray(complaintsData) ? complaintsData : [];
      const previousMap = new Map(
        previousComplaintsRef.current.map((complaint) => [complaint._id, complaint.status])
      );
      const newlyResolved = nextComplaints.find(
        (complaint) => complaint.status === "Resolved" && previousMap.get(complaint._id) !== "Resolved"
      );

      if (newlyResolved) {
        setResolutionAlert({
          id: newlyResolved._id,
          title: newlyResolved.message?.split("\n")[0]?.replace("Issue Type: ", "") || "Complaint resolved",
          note: newlyResolved.resolutionNotes || "Admin resolved your complaint.",
        });
      }

      previousComplaintsRef.current = nextComplaints;
      setComplaints(nextComplaints);
    } catch (error) {
      console.error("Error refreshing complaints:", error);
    } finally {
      if (silent) {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSupportData = async () => {
      try {
        const profileData = await apiGet("users/me");
        if (!isMounted) {
          return;
        }

        const currentUser = profileData?.user || null;
        const normalizedRole = normalizeRole(currentUser?.role);
        setUser(currentUser);
        setRole(normalizedRole);

        const [complaintsData, ordersData] = await Promise.allSettled([
          apiGet("complaints"),
          apiGet("orders"),
        ]);

        if (!isMounted) {
          return;
        }

        if (complaintsData.status === "fulfilled") {
          const initialComplaints = Array.isArray(complaintsData.value) ? complaintsData.value : [];
          previousComplaintsRef.current = initialComplaints;
          setComplaints(initialComplaints);
        }

        if (ordersData.status === "fulfilled") {
          setOrders(Array.isArray(ordersData.value) ? ordersData.value : []);
        }
      } catch (error) {
        console.error("Error loading complaint center:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSupportData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchComplaints({ silent: true });
    }, 10000);

    const handleWindowFocus = () => {
      fetchComplaints({ silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchComplaints({ silent: true });
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchComplaints]);

  const roleConfig = useMemo(() => COMPLAINT_CONFIG[role] || COMPLAINT_CONFIG.customer, [role]);

  const categories = useMemo(
    () => ["all", ...roleConfig.categories],
    [roleConfig]
  );

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === "all") {
      return roleConfig.templates;
    }

    return roleConfig.templates.filter((template) => template.category === selectedCategory);
  }, [roleConfig, selectedCategory]);

  const openCount = complaints.filter((complaint) => complaint.status === "Open").length;
  const resolvedCount = complaints.filter((complaint) => complaint.status === "Resolved").length;
  const recentResolvedComplaints = complaints
    .filter((complaint) => complaint.status === "Resolved")
    .slice(0, 3);

  const handleQuestionClick = (template) => {
    setSelectedTemplate(template);
    setSelectedCategory(template.category);
    setCustomMessage((currentValue) => currentValue.trim() ? currentValue : `${template.title}: `);
  };

  const handleSubmitComplaint = async (event) => {
    event.preventDefault();

    const detailText = customMessage.trim();
    const finalMessage = [
      selectedTemplate ? `Issue Type: ${selectedTemplate.title}` : null,
      detailText ? `Details: ${detailText}` : selectedTemplate?.prompt || null,
    ].filter(Boolean).join("\n");

    if (!finalMessage) {
      alert("Please choose an issue or type your complaint details.");
      return;
    }

    setSubmitting(true);
    try {
      const createdComplaint = await apiPost("complaints", {
        severity,
        message: finalMessage,
        ...(relatedOrderId ? { orderId: relatedOrderId } : {}),
      });

      const linkedOrder = orders.find((order) => order._id === relatedOrderId) || null;
      const hydratedComplaint = {
        ...createdComplaint,
        customerId: user,
        orderId: linkedOrder,
        createdAt: createdComplaint?.createdAt || new Date().toISOString(),
      };

      setComplaints((currentComplaints) => [hydratedComplaint, ...currentComplaints]);
      setSelectedTemplate(null);
      setRelatedOrderId("");
      setSeverity("Medium");
      setCustomMessage("");
      setSelectedCategory("all");
      alert("Complaint submitted to admin successfully.");
    } catch (error) {
      console.error("Error creating complaint:", error);
      alert(error.message || "Failed to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="support-chat-container">
      <div className="support-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <div className="header-info">
          <h1>Complaints & Support</h1>
          <p className="status-indicator">
            <span className="status-dot"></span>
            Admin desk active
          </p>
        </div>
        <div className="header-actions">
          <button className="icon-btn" title="Go to account" onClick={() => navigate(roleConfig.backPath)}>
            👤
          </button>
        </div>
      </div>

      <div className="support-shell">
        <section className="support-hero-card">
          <div>
            <p className="support-kicker">{roleConfig.label} Complaint Desk</p>
            <h2>Submit a real issue to admin</h2>
            <p>{roleConfig.intro}</p>
          </div>
          <div className="support-hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">{complaints.length}</span>
              <span className="hero-stat-label">Total Complaints</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">{openCount}</span>
              <span className="hero-stat-label">Open</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">{resolvedCount}</span>
              <span className="hero-stat-label">Resolved</span>
            </div>
          </div>
        </section>

        {(resolutionAlert || recentResolvedComplaints.length > 0) && (
          <section className="support-panel resolution-updates-panel">
            <div className="resolution-updates-header">
              <div>
                <p className="support-kicker">Admin Updates</p>
                <h3>Complaint resolution messages</h3>
              </div>
              <button className="secondary-action" type="button" onClick={() => fetchComplaints({ silent: true })}>
                {refreshing ? "Refreshing..." : "Refresh Updates"}
              </button>
            </div>

            {resolutionAlert && (
              <div className="resolution-alert-banner">
                <div>
                  <strong>{resolutionAlert.title}</strong>
                  <p>{resolutionAlert.note}</p>
                </div>
                <button type="button" className="dismiss-alert-btn" onClick={() => setResolutionAlert(null)}>
                  Dismiss
                </button>
              </div>
            )}

            <div className="resolution-update-list">
              {recentResolvedComplaints.map((complaint) => (
                <article key={complaint._id} className="resolution-update-card">
                  <div>
                    <h4>{complaint.message?.split("\n")[0]?.replace("Issue Type: ", "") || "Complaint resolved"}</h4>
                    <p>{formatComplaintDate(complaint.createdAt)}</p>
                  </div>
                  <div className="resolution-update-note">
                    {complaint.resolutionNotes || "Admin resolved your complaint."}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="support-grid">
          <section className="support-panel quick-actions-container">
            <p className="quick-actions-title">Choose a complaint topic for {roleConfig.label.toLowerCase()}</p>
            <div className="category-filters">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`category-chip ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                  type="button"
                >
                  {category === "all" ? "All" : category}
                </button>
              ))}
            </div>

            <div className="faq-questions">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  className={`faq-question-btn ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                  onClick={() => handleQuestionClick(template)}
                  type="button"
                >
                  <span className="question-icon">⚠️</span>
                  <span className="question-text-wrap">
                    <span className="question-text">{template.title}</span>
                    <span className="question-prompt">{template.prompt}</span>
                  </span>
                  <span className="question-category">{template.category}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="support-panel complaint-form-panel">
            <div className="form-panel-header">
              <h3>Write your complaint</h3>
              <p>You can choose a suggested issue and still explain everything in your own words.</p>
            </div>

            <form className="complaint-form" onSubmit={handleSubmitComplaint}>
              <div className="form-row two-col">
                <label className="support-field">
                  <span>Issue severity</span>
                  <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </label>

                <label className="support-field">
                  <span>Related order</span>
                  <select value={relatedOrderId} onChange={(event) => setRelatedOrderId(event.target.value)}>
                    <option value="">No specific order</option>
                    {orders.map((order) => (
                      <option key={order._id || order.id || order.orderId} value={order._id || ""}>
                        {getOrderLabel(order)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="support-field">
                <span>Selected issue</span>
                <input
                  value={selectedTemplate?.title || "No preset selected"}
                  readOnly
                />
              </label>

              <label className="support-field">
                <span>Your message</span>
                <textarea
                  value={customMessage}
                  onChange={(event) => setCustomMessage(event.target.value)}
                  placeholder={selectedTemplate?.prompt || "Describe the issue clearly in your own words. Mention what happened, when it happened, and what help you need from admin."}
                  rows={8}
                />
              </label>

              <div className="form-actions">
                <button className="secondary-action" type="button" onClick={() => {
                  setSelectedTemplate(null);
                  setCustomMessage("");
                  setRelatedOrderId("");
                  setSeverity("Medium");
                }}>
                  Clear
                </button>
                <button className="primary-action" type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Complaint"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className="support-panel complaint-history-panel">
          <div className="form-panel-header">
            <h3>Your complaint history</h3>
            <p>Track what has already been sent to admin and whether it is resolved.</p>
          </div>

          {loading ? (
            <div className="empty-state">Loading complaint history...</div>
          ) : complaints.length === 0 ? (
            <div className="empty-state">No complaints submitted yet.</div>
          ) : (
            <div className="complaint-history-list">
              {complaints.map((complaint) => (
                <article key={complaint._id} className="complaint-history-card">
                  <div className="complaint-card-top">
                    <div>
                      <h4>{complaint.message?.split("\n")[0]?.replace("Issue Type: ", "") || "Complaint"}</h4>
                      <p>{formatComplaintDate(complaint.createdAt)}</p>
                    </div>
                    <div className="history-badges">
                      <span className={`history-status ${String(complaint.status || '').toLowerCase()}`}>{complaint.status}</span>
                      <span className="history-severity">{complaint.severity}</span>
                    </div>
                  </div>
                  <p className="history-message">{complaint.message}</p>
                  <div className="history-meta">
                    <span>Order: {complaint.orderId?.id || complaint.orderId?._id || "Not linked"}</span>
                    <span>Resolution: {complaint.status === "Resolved" ? (complaint.resolutionNotes || "Admin resolved your complaint.") : "Pending admin response"}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="support-footer">
        <div className="footer-info">
          <p>🕐 Support Hours: 24/7</p>
          <p>📧 support@agrimart.com</p>
          <p>☎ +91-1800-AGRIMART</p>
        </div>
      </div>
    </div>
  );
}
