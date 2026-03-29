import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../utils/api";
import "../styles/Chat.css";

const MINIMUM_MANUAL_OFFER = 15;

export default function Chat() {
  const navigate = useNavigate();
  const [chat, setChat] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatError, setChatError] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "transport" | "deal"

  const toUiChat = (apiChat, fallback = {}) => {
    const dealerId = apiChat?.dealerId?._id || apiChat?.dealerId || fallback.dealerId;
    const customerId = apiChat?.customerId?._id || apiChat?.customerId || fallback.customerId;
    const negotiatedPrice = apiChat?.negotiation?.finalPrice;
    const requestDetails = apiChat?.dealerRequestId || {};
    const pricing = requestDetails?.pricing || fallback?.pricing || {};
    const customerAddress = {
      phone: requestDetails?.customerPhone || fallback?.customerAddress?.phone || "",
      doorNo: requestDetails?.customerDoorNo || fallback?.customerAddress?.doorNo || "",
      country: requestDetails?.customerCountry || fallback?.customerAddress?.country || "",
      state: requestDetails?.customerState || fallback?.customerAddress?.state || "",
      district: requestDetails?.customerDistrict || fallback?.customerAddress?.district || "",
      mandal: requestDetails?.customerMandal || fallback?.customerAddress?.mandal || "",
      pincode: requestDetails?.customerPincode || fallback?.customerAddress?.pincode || "",
      locationText: requestDetails?.customerLocationText || fallback?.customerAddress?.locationText || "",
      coordinates: requestDetails?.customerCoordinates || fallback?.customerAddress?.coordinates || null,
      fullAddress: requestDetails?.fullAddress || fallback?.customerAddress?.fullAddress || "",
    };
    const pickupLocation = requestDetails?.pickupLocation || apiChat?.negotiation?.pickup || fallback?.pickup || fallback?.farmerLocation;
    const dropLocation = requestDetails?.dropLocation || apiChat?.negotiation?.drop || fallback?.drop;

    return {
      ...fallback,
      ...apiChat,
      chatId: apiChat?._id || fallback.chatId,
      dealerId,
      customerId,
      distance: Number(requestDetails?.distance || fallback?.distance || 0),
      pickupCoordinates: fallback?.pickupCoordinates || null,
      requestId: apiChat?.dealerRequestId?._id || fallback?.requestId,
      finalDealPrice: negotiatedPrice || fallback.finalDealPrice || fallback.offeredPrice || fallback.dealerPrice,
      dealerName: apiChat?.dealerId?.name || fallback.dealerName || "Dealer",
      dealerEmail: apiChat?.dealerId?.email || fallback.dealerEmail || "",
      farmerLocation: pickupLocation,
      pickup: pickupLocation,
      drop: dropLocation,
      pricing: {
        baseCharge: Number(pricing?.baseCharge || fallback?.pricing?.baseCharge || 0),
        finalCharge: Number(pricing?.finalCharge || fallback?.pricing?.finalCharge || negotiatedPrice || fallback?.dealerPrice || 0),
        batchDiscount: Number(pricing?.batchDiscount || fallback?.pricing?.batchDiscount || 0),
        batchDiscountRate: Number(pricing?.batchDiscountRate || fallback?.pricing?.batchDiscountRate || 0),
        batchDiscountRatePct: Number(pricing?.batchDiscountRatePct || fallback?.pricing?.batchDiscountRatePct || 0),
        dealerPayout: Number(pricing?.dealerPayout || fallback?.pricing?.dealerPayout || 0),
        platformContribution: Number(pricing?.platformContribution || fallback?.pricing?.platformContribution || 0),
        incentivePreview: pricing?.incentivePreview || fallback?.pricing?.incentivePreview || {
          eligible: false,
          dealerBonus: 0,
          farmerBonus: 0,
          totalBonus: 0,
        },
      },
      customerAddress,
      messages: (apiChat?.messages || []).map((m) => {
        const senderId = m.senderId?._id || m.senderId;
        return {
          sender: String(senderId) === String(dealerId) ? "dealer" : "customer",
          text: m.text,
          timestamp: new Date(m.createdAt || Date.now()).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          createdAt: m.createdAt,
        };
      }),
    };
  };

  const fetchChatById = async (chatId, fallback = {}) => {
    const data = await apiGet(`chats/${chatId}`);
    const mapped = toUiChat(data, fallback);
    setChat(mapped);
    setSelectedChatId(mapped.chatId || "");
    localStorage.setItem("activeChat", JSON.stringify(mapped));

    setChatList((prev) => {
      const withoutCurrent = prev.filter((item) => item._id !== data._id);
      return [data, ...withoutCurrent];
    });

    return mapped;
  };

  useEffect(() => {
    const loadChat = async () => {
      setLoading(true);
      setChatError("");

      const data = JSON.parse(localStorage.getItem("activeChat") || "null");

      try {
        const chats = await apiGet("chats");
        const list = Array.isArray(chats) ? chats : [];
        setChatList(list);

        const activeChatId = data?.chatId;
        const activeRequestId = data?.requestId;

        let initialChat = null;
        if (activeChatId) {
          initialChat = list.find((item) => item._id === activeChatId) || null;
        }

        if (!initialChat && activeRequestId) {
          initialChat =
            list.find(
              (item) => String(item?.dealerRequestId?._id || item?.dealerRequestId || "") === String(activeRequestId)
            ) || null;
        }

        if (!initialChat && list.length > 0) {
          initialChat = list[0];
        }

        if (initialChat?._id) {
          await fetchChatById(initialChat._id, data || {});
          return;
        }

        if (data?.dealerId) {
          const created = await apiPost("chats", { dealerId: data.dealerId });
          await fetchChatById(created._id, data);
          return;
        }

        setChat(null);
      } catch (err) {
        console.error("Failed to load chat:", err.message);
        setChatError(err.message || "Unable to load chats");
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, []);

  useEffect(() => {
    if (!chat?.chatId) return undefined;

    const interval = setInterval(() => {
      fetchChatById(chat.chatId, chat).catch((err) => {
        console.error("Chat refresh failed:", err.message);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [chat?.chatId]);

  const handleSwitchConversation = async (nextChatId) => {
    if (!nextChatId || nextChatId === chat?.chatId) return;

    try {
      await fetchChatById(nextChatId, chat || {});
    } catch (err) {
      console.error("Failed to switch conversation:", err.message);
      alert(`Unable to open conversation: ${err.message}`);
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || !chat.chatId) return;

    try {
      await apiPost(`chats/${chat.chatId}/message`, { text });
      setMessageInput("");
      await fetchChatById(chat.chatId, chat);
    } catch (err) {
      console.error("Error sending message:", err.message);
      alert(`Failed to send message: ${err.message}`);
    }
  };

  const sendOffer = async () => {
    if (!offerPrice) {
      alert("Enter offer price");
      return;
    }

    const priceAmount = Number(offerPrice);
    if (!Number.isFinite(priceAmount) || priceAmount < MINIMUM_MANUAL_OFFER) {
      alert(`Counter offer must be at least Rs.${MINIMUM_MANUAL_OFFER}.`);
      return;
    }

    const text = `Customer counter-offer: Rs.${priceAmount}`;
    await sendMessage(text);
    setOfferPrice("");
  };

  const confirmDeal = async () => {
    try {
      if (!chat.chatId) return;

      const finalPrice = chat.negotiation?.finalPrice || chat.finalDealPrice || chat.dealerPrice;
      if (!finalPrice) {
        alert("Dealer final price is not set yet.");
        return;
      }

      const decision = await apiPost(`chats/${chat.chatId}/price-decision`, {
        decision: "confirm",
      });

      await fetchChatById(chat.chatId, chat);

      if (!decision?.bothConfirmed) {
        alert("Your confirmation is saved. Waiting for dealer confirmation.");
        return;
      }

      alert("Both parties confirmed the negotiated price. You can now go to payment.");
    } catch (err) {
      console.error("Confirm failed:", err.message);
      alert(`Unable to confirm deal: ${err.message}`);
    }
  };

  const proceedToPayment = async () => {
    try {
      if (!chat.chatId) return;

      const finalPrice = chat.negotiation?.finalPrice || chat.finalDealPrice || chat.dealerPrice;
      const bothConfirmed =
        chat.negotiation?.customerDecision === "confirmed" &&
        chat.negotiation?.dealerDecision === "confirmed";

      if (!bothConfirmed) {
        alert("Both customer and dealer must confirm the price before payment.");
        return;
      }

      // Keep backward compatibility route data and lock final price
      await apiPost(`chats/${chat.chatId}/confirm`, {
        finalPrice,
        vehicle: chat.vehicle,
        pickup: chat.farmerLocation,
        drop: chat.drop,
        customerAddress: chat.customerAddress,
      });

      // Finalize price in Order
      try {
        await apiPost(`chats/${chat.chatId}/finalize-price`);
      } catch (err) {
        console.warn("Could not finalize price in order:", err.message);
      }

      localStorage.setItem(
        "confirmedTransport",
        JSON.stringify({
          ...chat,
          status: "CONFIRMED",
        })
      );

      localStorage.setItem(
        "finalPrice",
        JSON.stringify({
          transportFee: finalPrice,
          baseTransportFee: Number(chat.pricing?.baseCharge || finalPrice || 0),
          batchDiscount: Math.max(
            Number(chat.pricing?.batchDiscount || 0),
            Math.max(Number(chat.pricing?.baseCharge || finalPrice || 0) - Number(finalPrice || 0), 0)
          ),
          dealerPayout: Math.max(
            Number(chat.pricing?.dealerPayout || 0),
            Number(finalPrice || 0),
            0.85 * Number(chat.pricing?.baseCharge || finalPrice || 0),
            60
          ),
          platformContribution: Math.max(
            Number(chat.pricing?.platformContribution || 0),
            Math.max(
              Number(chat.pricing?.dealerPayout || 0),
              Number(finalPrice || 0),
              0.85 * Number(chat.pricing?.baseCharge || finalPrice || 0),
              60
            ) - Number(finalPrice || 0)
          ),
          incentivePreview: chat.pricing?.incentivePreview || {
            eligible: false,
            dealerBonus: 0,
            farmerBonus: 0,
            totalBonus: 0,
          },
          dealerName: chat.dealerName,
          vehicle: chat.vehicle,
          distance: Number(chat.distance || 0),
          pickupCoordinates: chat.pickupCoordinates || null,
          pickup: chat.farmerLocation,
          drop: chat.drop,
          requestId: chat.requestId,
          customerAddress: chat.customerAddress,
        })
      );

      localStorage.setItem(
        "selectedDealer",
        JSON.stringify({
          id: chat.dealerId || Date.now(),
          name: chat.dealerName,
          vehicle: chat.vehicle,
          price: finalPrice,
        })
      );

      localStorage.removeItem("activeChat");
      alert("Both parties confirmed. Redirecting to payment page.");
      navigate("/payment");
    } catch (err) {
      console.error("Proceed to payment failed:", err.message);
      alert(`Unable to go to payment: ${err.message}`);
    }
  };

  const rejectDeal = async () => {
    try {
      if (!chat.chatId) return;
      await apiPost(`chats/${chat.chatId}/price-decision`, { decision: "reject" });
      await fetchChatById(chat.chatId, chat);
      alert("You rejected this price. Ask dealer for a new offer.");
    } catch (err) {
      console.error("Reject failed:", err.message);
      alert(`Unable to reject price: ${err.message}`);
    }
  };

  const cancelChat = () => {
    if (window.confirm("Are you sure you want to close this chat?")) {
      localStorage.removeItem("activeChat");
      navigate("/account");
    }
  };

  const getDealerInitials = () => {
    const name = chat.dealerName || "Dealer";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const bothSidesConfirmed =
    chat?.negotiation?.customerDecision === "confirmed" &&
    chat?.negotiation?.dealerDecision === "confirmed";
  const resolvedFinalPrice = Number(chat?.negotiation?.finalPrice || chat?.finalDealPrice || chat?.dealerPrice || 0);
  const resolvedBasePrice = Number(chat?.pricing?.baseCharge || resolvedFinalPrice || 0);
  const resolvedDiscount = Math.max(
    Number(chat?.pricing?.batchDiscount || 0),
    Math.max(resolvedBasePrice - resolvedFinalPrice, 0)
  );

  const getLastMessageText = (chatItem) => {
    const lastMsg = chatItem?.messages?.[chatItem.messages.length - 1]?.text;
    if (!lastMsg) return "No messages yet";
    return lastMsg.length > 44 ? `${lastMsg.slice(0, 44)}...` : lastMsg;
  };

  const getChatTime = (chatItem) => {
    if (!chatItem?.updatedAt) return "";
    return new Date(chatItem.updatedAt).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="chat-state-page">
        <div className="customer-chat-topbar">
          <h2>🌿 Dealer Chats</h2>
          <button className="back-btn" onClick={() => navigate("/account")}>← Back</button>
        </div>
        <div className="chat-state-body">
          <div className="chat-spinner"></div>
          <p className="chat-state-title">Loading your conversations…</p>
        </div>
      </div>
    );
  }

  if (!chat && !loading) {
    return (
      <div className="chat-state-page">
        <div className="customer-chat-topbar">
          <h2>🌿 Dealer Chats</h2>
          <button className="back-btn" onClick={() => navigate("/account")}>← Back</button>
        </div>
        <div className="chat-state-body">
          <span style={{ fontSize: 52 }}>💬</span>
          <p className="chat-state-title">No dealer conversations yet</p>
          {chatError && <p className="chat-state-sub" style={{ color: '#C62828' }}>Error: {chatError}</p>}
          <button className="chat-state-btn primary" onClick={() => navigate("/transport-dealers")}>
            Browse Transport Dealers
          </button>
          <button className="chat-state-btn ghost" onClick={() => navigate("/account")}>
            Back to Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-chat-history-page">
      <div className="customer-chat-topbar">
        <h2>🌿 Dealer Chats</h2>
        <button className="back-btn" onClick={() => navigate("/account")}>← Back</button>
      </div>

      <div className="customer-chat-layout">

        {/* ── SIDEBAR ── */}
        <div className="customer-chat-sidebar">
          <div className="customer-chat-sidebar-header">Conversations ({chatList.length})</div>
          {chatList.length === 0 ? (
            <div className="empty-chats">No conversations yet</div>
          ) : (
            chatList.map((item) => {
              const dealerName = item?.dealerId?.name || "Dealer";
              return (
                <div
                  key={item._id}
                  className={`customer-chat-item ${String(selectedChatId || chat?.chatId) === String(item._id) ? "active" : ""}`}
                  onClick={() => handleSwitchConversation(item._id)}
                >
                  <div className="customer-chat-avatar">{dealerName.charAt(0).toUpperCase()}</div>
                  <div className="customer-chat-meta">
                    <div className="customer-chat-name">{dealerName}</div>
                    <div className="customer-chat-preview">{getLastMessageText(item)}</div>
                  </div>
                  <div className="customer-chat-time">{getChatTime(item)}</div>
                </div>
              );
            })
          )}
        </div>

        {/* ── MAIN PANEL ── */}
        <div className="customer-chat-main">

          {/* Dealer Header */}
          <div className="chat-header">
            <div className="header-content">
              <div className="dealer-info-header">
                <div className="avatar-large">{getDealerInitials()}</div>
                <div className="header-text">
                  <h3>{chat.dealerName}</h3>
                  <p className="status-text">
                    <span className="online-badge"></span> Active now
                  </p>
                </div>
              </div>
              <button className="close-btn" onClick={cancelChat} title="Close chat">✕</button>
            </div>
          </div>

          {/* ── TAB BAR ── */}
          <div className="chat-tab-bar">
            <button
              className={`chat-tab-btn ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              <span className="tab-icon-emoji">💬</span> Chat
            </button>
            <button
              className={`chat-tab-btn ${activeTab === "transport" ? "active" : ""}`}
              onClick={() => setActiveTab("transport")}
            >
              <span className="tab-icon-emoji">🚚</span> Transport
            </button>
            <button
              className={`chat-tab-btn ${activeTab === "deal" ? "active" : ""}`}
              onClick={() => setActiveTab("deal")}
            >
              <span className="tab-icon-emoji">🤝</span> Deal
              {(chat.negotiation?.dealerDecision === "confirmed" && chat.negotiation?.customerDecision !== "confirmed") && (
                <span className="tab-alert-dot"></span>
              )}
            </button>
          </div>

          {/* ══════════════════════════════════
              TAB 1 – CHAT
          ══════════════════════════════════ */}
          {activeTab === "chat" && (
            <div className="tab-panel">
              {/* Status banners */}
              {chat.negotiation?.dealerDecision === "rejected" && (
                <div className="chat-status-banner rejected">
                  ❌ Dealer rejected the price — send a new counter offer.
                </div>
              )}
              {chat.negotiation?.dealerDecision === "confirmed" && chat.negotiation?.customerDecision !== "confirmed" && (
                <div className="chat-status-banner confirmed">
                  ✅ Dealer confirmed! Go to the <button className="inline-tab-link" onClick={() => setActiveTab("deal")}>Deal tab</button> to confirm.
                </div>
              )}

              {/* Messages */}
              <div className="chat-messages">
                {chat.messages && chat.messages.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-text">Start the conversation with {chat.dealerName}</p>
                  </div>
                ) : (
                  chat.messages.map((m, i) => (
                    <div key={i} className={`message-group ${m.sender}`}>
                      <div className="message-item">
                        {m.sender === "dealer" && <div className="avatar-small">{getDealerInitials()}</div>}
                        <div className="message-bubble">
                          <p className="message-text">{m.text}</p>
                          <span className="message-time">{m.timestamp}</span>
                        </div>
                        {m.sender === "customer" && <span className="message-status">sent</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="chat-input-section">
                <div className="chat-input-wrapper">
                  <input
                    type="text"
                    className="message-input"
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage(messageInput)}
                  />
                  <button className="send-btn" onClick={() => sendMessage(messageInput)} title="Send message">
                    <span className="send-icon" aria-hidden="true">➤</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              TAB 2 – TRANSPORT DETAILS
          ══════════════════════════════════ */}
          {activeTab === "transport" && (
            <div className="tab-panel tab-panel-scroll">
              <div className="tab-card">
                <div className="tab-card-title">📍 Route & Location</div>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Farmer</span>
                    <span className="info-value">{chat.farmerName || "—"}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Pickup</span>
                    <span className="info-value">{chat.farmerLocation || "—"}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Drop</span>
                    <span className="info-value">{chat.drop || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="tab-card">
                <div className="tab-card-title">👤 Customer Address</div>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{chat.customerAddress?.phone || "—"}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Door No</span>
                    <span className="info-value">{chat.customerAddress?.doorNo || "—"}</span>
                  </div>
                  <div className="info-row wide">
                    <span className="info-label">Full Address</span>
                    <span className="info-value">{chat.customerAddress?.fullAddress?.trim() || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="tab-card">
                <div className="tab-card-title">🚛 Vehicle & Pricing</div>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Vehicle</span>
                    <span className="info-value">
                      {chat.vehicle ? <span className="vehicle-badge">{chat.vehicle}</span> : "—"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Quantity</span>
                    <span className="info-value">{chat.totalQty || 0} kg</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Base Delivery</span>
                    <span className="info-value price">{resolvedBasePrice ? `Rs.${resolvedBasePrice}` : "TBD"}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Batch Discount</span>
                    <span className="info-value" style={{ color: "#2e7d32", fontWeight: 700 }}>
                      {resolvedDiscount > 0 ? `-Rs.${resolvedDiscount}` : "Rs.0"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Final Delivery</span>
                    <span className="info-value price highlight">{resolvedFinalPrice ? `Rs.${resolvedFinalPrice}` : "TBD"}</span>
                  </div>
                </div>
                {resolvedDiscount > 0 && (
                  <div className="discount-note">
                    🎉 Platform-funded delivery discount applied for this route and order.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              TAB 3 – DEAL
          ══════════════════════════════════ */}
          {activeTab === "deal" && (
            <div className="tab-panel tab-panel-scroll">

              {/* Counter Offer Card */}
              <div className="tab-card">
                <div className="tab-card-title">💸 Send Counter Offer</div>
                <div className="offer-input-wrapper">
                  <div className="input-group">
                    <input
                      type="number"
                      className="price-input"
                      placeholder="Enter your counter offer (Rs.)"
                      value={offerPrice}
                      min={MINIMUM_MANUAL_OFFER}
                      onChange={(e) => setOfferPrice(e.target.value)}
                    />
                    <button className="offer-btn" onClick={sendOffer}>Send Offer</button>
                  </div>
                  <p className="offer-hint">Sends your offer to the dealer in real time. Minimum: Rs.15.</p>
                </div>
              </div>

              {/* Deal Confirmation Card */}
              {(chat.negotiation?.finalPrice || chat.finalDealPrice || chat.dealerPrice) && (
                <div className="tab-card">
                  <div className="tab-card-title">✅ Confirm Transport Deal</div>
                  <div className="info-grid">
                    <div className="info-row">
                      <span className="info-label">Route</span>
                      <span className="info-value">{chat.farmerLocation} → {chat.drop}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Vehicle</span>
                      <span className="info-value">{chat.vehicle || "—"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Base Delivery</span>
                      <span className="info-value">Rs.{resolvedBasePrice || 0}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Discount (Platform)</span>
                      <span className="info-value" style={{ color: "#2e7d32", fontWeight: 700 }}>-Rs.{resolvedDiscount || 0}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Final Price</span>
                      <span className="info-value price highlight final-price">Rs.{resolvedFinalPrice || 0}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Your Decision</span>
                      <span className={`decision-badge ${chat.negotiation?.customerDecision || "pending"}`}>
                        {chat.negotiation?.customerDecision || "pending"}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Dealer Decision</span>
                      <span className={`decision-badge ${chat.negotiation?.dealerDecision || "pending"}`}>
                        {chat.negotiation?.dealerDecision || "pending"}
                      </span>
                    </div>
                  </div>
                  <div className="action-buttons">
                    <button className="confirm-btn" onClick={confirmDeal}>✓ Confirm Price</button>
                    <button className="reject-btn" onClick={rejectDeal}>✗ Reject Price</button>
                    {bothSidesConfirmed && (
                      <button className="confirm-btn go-payment-btn" onClick={proceedToPayment}>
                        🏦 Go to Payment
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* No deal yet */}
              {!(chat.negotiation?.finalPrice || chat.finalDealPrice || chat.dealerPrice) && (
                <div className="tab-empty">
                  <span style={{ fontSize: 40 }}>🤝</span>
                  <p>No deal price set yet. Chat with the dealer to negotiate.</p>
                  <button className="chat-tab-link" onClick={() => setActiveTab("chat")}>Go to Chat →</button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
