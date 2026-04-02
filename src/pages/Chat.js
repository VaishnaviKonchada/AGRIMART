import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiGet, apiPost } from "../utils/api";
import CustomerHeader from "../components/CustomerHeader";
import BottomNav from "../components/BottomNav";
import "../styles/Chat.css";

const MINIMUM_MANUAL_OFFER = 15;

export default function Chat() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = JSON.parse(localStorage.getItem("registeredUser") || "{}");
  const role = user.role || "";
  const [chat, setChat] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatError, setChatError] = useState("");
  const [visibleDetail, setVisibleDetail] = useState("customer"); // "customer" | "farmer" | "dealer"
  const [messageInput, setMessageInput] = useState("");
  const [counterOffer, setCounterOffer] = useState("");
  const [isCounterLoading, setIsCounterLoading] = useState(false);
  const { i18n } = useTranslation();

  const bothSidesConfirmed = 
    chat?.negotiation?.customerDecision === 'confirmed' && 
    chat?.negotiation?.dealerDecision === 'confirmed';

  const localizeValue = (value, type = "crop") => {
    if (!value) return value;
    const lookup = t(`${value.toLowerCase()}`, { 
      defaultValue: t(`common.${value.toLowerCase()}`, { 
        defaultValue: t(`farmerModal.${value.toLowerCase()}`, {
          defaultValue: value 
        })
      }) 
    });
    return lookup;
  };


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
      dealerName: apiChat?.dealerId?.name || fallback.dealerName || t('common.dealer', "Dealer"),
      dealerEmail: apiChat?.dealerId?.email || fallback.dealerEmail || "",
      farmerName: requestDetails?.farmerName || fallback?.farmerName || "",
      farmerLocation: pickupLocation,
      pickup: pickupLocation,
      drop: dropLocation,
      cropName: localizeValue(requestDetails?.cropName || requestDetails?.cropItem || requestDetails?.cropId?.name || apiChat?.cropName || apiChat?.cropItem || fallback?.cropName || fallback?.cropItem) || t('common.crop', "Crop"),
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
      dealerPrice: Number(requestDetails?.quotedPrice || fallback?.dealerPrice || 0),
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
        setChatError(err.message || t('chat.unableToLoad', "Unable to load chats"));
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
    }
  };

  const sendOffer = async () => {
    if (!counterOffer || !chat?.chatId) return;
    const val = parseFloat(counterOffer);
    if (isNaN(val) || val < 1) {
      alert("Please enter a valid offer price.");
      return;
    }

    setIsCounterLoading(true);
    try {
      const text = `Customer counter-offer: Rs.${val}`;
      // Use standard message endpoint which also updates negotiation state on backend
      const updatedChat = await apiPost(`chats/${chat.chatId}/message`, { text });
      setCounterOffer(""); // Clear input on success
      setChat(toUiChat(updatedChat, chat));
      await fetchChatById(chat.chatId, chat);
    } catch (err) {
      console.error("❌ Failed to send offer:", err.message);
      alert("Unable to send offer. Please try again.");
    } finally {
      setIsCounterLoading(false);
    }
  };

  const confirmDeal = async () => {
    try {
      if (!chat?.chatId) return;

      const finalPrice = chat?.negotiation?.finalPrice || resolvedFinalPrice;
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
      if (!chat?.chatId) return;

      const finalPrice = chat?.negotiation?.finalPrice || resolvedFinalPrice;

      if (!bothSidesConfirmed) {
        alert("Both customer and dealer must confirm the price before payment.");
        return;
      }

      // 1. Backend Confirm
      await apiPost(`chats/${chat.chatId}/confirm`, {
        finalPrice,
        vehicle: chat.vehicle || chat.dealerRequestId?.vehicleType,
        pickup: chat.pickup || chat.farmerLocation,
        drop: chat.drop,
        customerAddress: chat.customerAddress,
      });

      // 2. Finalize
      try {
        await apiPost(`chats/${chat.chatId}/finalize-price`);
      } catch (err) {
        console.warn("Could not finalize price in order:", err.message);
      }

      // 3. Exact Storage logic from your provided code
      localStorage.setItem("confirmedTransport", JSON.stringify({ ...chat, status: "CONFIRMED" }));

      localStorage.setItem("finalPrice", JSON.stringify({
        transportFee: finalPrice,
        transportBaseFee: Number(chat.pricing?.baseCharge || finalPrice || 0),
        deliveryDiscount: Math.max(
          Number(chat.pricing?.discountAmount || 0),
          Math.max(Number(chat.pricing?.baseCharge || finalPrice || 0) - Number(finalPrice || 0), 0)
        ),
        platformContribution: Math.max(
          Number(chat.pricing?.platformContribution || 0),
          Number(chat.pricing?.discountAmount || 0),
          Math.max(Number(chat.pricing?.baseCharge || finalPrice || 0) - Number(finalPrice || 0), 0)
        ),
        incentivePreview: chat.pricing?.incentivePreview || {
          eligible: false,
          dealerBonus: 0,
          farmerBonus: 0,
          totalBonus: 0,
        },
        dealerName: chat.dealerName,
        vehicle: chat.vehicle || chat.dealerRequestId?.vehicleType,
        distance: Number(chat.distance || 0),
        pickupCoordinates: chat.pickupCoordinates || null,
        pickup: chat.pickup || chat.farmerLocation,
        drop: chat.drop,
        requestId: chat.requestId || chat.dealerRequestId?._id,
        customerAddress: chat.customerAddress,
      }));

      localStorage.setItem("selectedDealer", JSON.stringify({
        id: chat.dealerId || Date.now(),
        name: chat.dealerName,
        vehicle: chat.vehicle || chat.dealerRequestId?.vehicleType,
        price: finalPrice,
      }));

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
      if (!chat?.chatId) return;
      await apiPost(`chats/${chat.chatId}/price-decision`, { decision: "reject" });
      await fetchChatById(chat.chatId, chat);
      alert("You rejected this price. Ask dealer for a new offer.");
    } catch (err) {
      console.error("Reject failed:", err.message);
      alert(`Unable to reject price: ${err.message}`);
    }
  };


  const cancelChat = () => {
    if (window.confirm(t('chat.closeConfirm', "Are you sure you want to close this chat?"))) {
      localStorage.removeItem("activeChat");
      navigate("/account");
    }
  };

  const getDealerInitials = () => {
    const name = chat.dealerName || t('common.dealer', "Dealer");
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Definition moved to top to avoid initialization errors
  const resolvedFinalPrice = Number(chat?.negotiation?.finalPrice || chat?.finalDealPrice || chat?.dealerPrice || 0);

  const getLastMessageText = (chatItem) => {
    const lastMsg = chatItem?.messages?.[chatItem.messages.length - 1]?.text;
    if (!lastMsg) return t('chat.noMessages', "No messages yet");
    return lastMsg.length > 44 ? `${lastMsg.slice(0, 44)}...` : lastMsg;
  };

  const getChatTime = (chatItem) => {
    if (!chatItem?.updatedAt) return "";
    return new Date(chatItem.updatedAt).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="chat-state-page">
        <CustomerHeader />
        <div className="chat-state-body">
          <div className="chat-spinner"></div>
          <p className="chat-state-title">{t('chat.loadingConvo', 'Loading your conversations...')}</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!chat && !loading) {
    return (
      <div className="chat-state-page">
        <CustomerHeader />
        <div className="chat-state-body">
          <span style={{ fontSize: 52 }}>💬</span>
          <p className="chat-state-title">{t('chat.noConvo', 'No dealer conversations yet')}</p>
          {chatError && <p className="chat-state-sub" style={{ color: '#C62828' }}>{t('common.error', 'Error')}: {chatError}</p>}
          <button className="chat-state-btn primary" onClick={() => navigate("/transport-dealers")}>
            {t('chat.browseDealers', 'Browse Transport Dealers')}
          </button>
          <button className="chat-state-btn ghost" onClick={() => navigate("/account")}>
            {t('chat.backToAccount', 'Back to Account')}
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="customer-chat-history-page">
      <CustomerHeader />

      <div className="customer-chat-layout">

        {/* ── SIDEBAR ── */}
        <div className="customer-chat-sidebar">
          <div className="customer-chat-sidebar-header">{t('chat.conversations', 'Conversations')} ({chatList.length})</div>
          {chatList.length === 0 ? (
            <div className="empty-chats">{t('chat.noConversations', 'No conversations yet')}</div>
          ) : (
            chatList.map((item) => {
              const dealerName = item?.dealerId?.name || t('common.dealer', "Dealer");
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

          {/* ── DEALER HEADER (from image 2) ── */}
          <div className="dealer-modern-header">
             <div className="dealer-profile-main">
                <div className="avatar-large">{getDealerInitials()}</div>
                <div className="dealer-name-status">
                   <h3>{chat.dealerName}</h3>
                   <span className="online-status"><span className="pulse-dot">●</span> {t('chat.activeNow', 'Active now')}</span>
                </div>
             </div>
             <button className="chat-close-x" onClick={cancelChat}>X</button>
          </div>

          <div className="chat-unified-content">
            
            {/* ── DETAIL TOGGLE BUTTONS ── */}
            <div className="detail-toggle-row">
               <button 
                 className={`detail-btn ${visibleDetail === 'customer' ? 'active' : ''}`}
                 onClick={() => setVisibleDetail('customer')}
               >
                 👤 {t('common.customer', 'Customer')}
               </button>
               <button 
                 className={`detail-btn ${visibleDetail === 'farmer' ? 'active' : ''}`}
                 onClick={() => setVisibleDetail('farmer')}
               >
                 👨‍🌾 {t('common.farmer', 'Farmer')}
               </button>
               <button 
                 className={`detail-btn ${visibleDetail === 'dealer' ? 'active' : ''}`}
                 onClick={() => setVisibleDetail('dealer')}
               >
                 🚚 {t('common.dealer', 'Dealer')}
               </button>
            </div>

            {/* ── CONDITIONALLY RENDERED INFO GRID ── */}
            <div className="unified-transport-grid">
               {visibleDetail === 'customer' && (
                 <>
                   <div className="grid-item">
                      <label>{t('customerAccount.phone', 'CUSTOMER PHONE')}:</label>
                      <div className="box">{chat.customerAddress?.phone || "—"}</div>
                   </div>
                   <div className="grid-item">
                      <label>{t('customerAccount.doorNo', 'DOOR NO')}:</label>
                      <div className="box">{chat.customerAddress?.doorNo || "—"}</div>
                   </div>
                   <div className="grid-item wide">
                      <label>{t('customerAccount.fullLocation', 'DELIVERY ADDRESS')}:</label>
                      <div className="box">{chat.customerAddress?.locationText || chat.customerAddress?.fullAddress || "—"}</div>
                   </div>
                   <div className="grid-item">
                      <label>{t('chat.coordinates', 'COORDINATES (LAT/LNG)')}:</label>
                      <div className="box highlight-box">{chat.customerAddress?.coordinates?.lat?.toFixed(4) || "—"}, {chat.customerAddress?.coordinates?.lng?.toFixed(4) || "—"}</div>
                   </div>
                   <div className="grid-item">
                      <label>{t('cart.totalQuantity', 'ORDER QUANTITY')}:</label>
                      <div className="box">{chat.totalQty || 0} kg</div>
                   </div>
                 </>
               )}

               {visibleDetail === 'farmer' && (
                 <>
                   <div className="grid-item">
                      <label>{t('orders.name', 'FARMER NAME')}:</label>
                      <div className="box">{chat.farmerName || "—"}</div>
                   </div>
                   <div className="grid-item wide">
                      <label>{t('transportDealers.pickup', 'PICKUP LOCATION')}:</label>
                      <div className="box">{chat.farmerLocation || "—"}</div>
                   </div>
                 </>
               )}

               {visibleDetail === 'dealer' && (
                 <>
                   <div className="grid-item">
                      <label>{t('common.dealer', 'DEALER NAME')}:</label>
                      <div className="box">{chat.dealerName || "—"}</div>
                   </div>
                   <div className="grid-item">
                      <label>{t('chat.dealerEmail', 'DEALER EMAIL')}:</label>
                      <div className="box">{chat.dealerEmail || "—"}</div>
                   </div>
                   <div className="grid-item">
                      <label>{t('chat.dealerPrice', 'DEALER PRICE')}:</label>
                      <div className="box">Rs.{chat.dealerPrice || 0}</div>
                   </div>
                 </>
               )}
            </div>

            {/* ── CHAT MESSAGES AREA ── */}
            <div className="unified-chat-history">
              {chat.messages && chat.messages.length > 0 ? (
                chat.messages.map((m, i) => (
                  <div key={i} className={`message-group ${m.sender}`}>
                    <div className="message-item">
                      {m.sender === "dealer" && <div className="avatar-small">{getDealerInitials()}</div>}
                      <div className="message-bubble">
                        <p className="message-text">{m.text}</p>
                        <span className="message-time">{m.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                 <div className="chat-empty-hint">{t('chat.startMessageHint', 'Start negotiation by sending a message...')}</div>
              )}
            </div>

          </div>

          {/* ── INTERACTION PANEL (Counter Offer, Confirm/Reject, Proceed) ── */}
          <div className="chat-interaction-panel" style={{ padding: '0 16px', background: '#fff', borderTop: '1px solid #eee' }}>
             
             {/* Counter Offer Row (Customer Only) */}
             {role === 'customer' && (
               <div className="dealer-offer-section" style={{ borderTop: 'none', padding: '12px 0' }}>
                  <div className="offer-input-wrapper" style={{ padding: 0 }}>
                     <div className="input-group">
                        <input 
                          type="number" 
                          className="price-input"
                          placeholder={t('chat.enterOffer', "Final Price (Rs.)")}
                          value={counterOffer}
                          onChange={(e) => setCounterOffer(e.target.value)}
                        />
                        <button className="offer-btn" onClick={sendOffer} disabled={isCounterLoading}>
                           {isCounterLoading ? "..." : t('chat.sendOffer', "Send Offer")}
                        </button>
                     </div>
                  </div>
               </div>
             )}

             {/* Message Input Row + Confirm/Reject Beside */}
             <div className="chat-modern-input-row" style={{ display: 'flex', gap: '8px', paddingBottom: '12px' }}>
                <input
                   type="text"
                   className="modern-msg-input"
                   placeholder={t('chat.placeholder', "Type message...")}
                   value={messageInput}
                   onChange={(e) => setMessageInput(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && sendMessage(messageInput)}
                   style={{ flex: 1 }}
                />
                <button className="modern-send-btn" onClick={() => sendMessage(messageInput)} style={{ minWidth: '40px' }}>
                   <span className="send-arrow">➤</span>
                </button>

                {/* Confirm/Reject Buttons beside message field */}
                <div className="quick-negotiation-btns" style={{ display: 'flex', gap: '4px' }}>
                   <button className="confirm-btn" onClick={confirmDeal} style={{ minWidth: '40px', padding: '0 10px' }} title="Confirm">
                      {t('common.confirm', '✓')}
                   </button>
                   <button className="reject-btn" onClick={rejectDeal} style={{ minWidth: '40px', padding: '0 10px' }} title="Reject">
                      {t('common.reject', '✕')}
                   </button>
                </div>
             </div>

             {/* Confirm and Proceed Button Row */}
             <div className="proceed-section" style={{ paddingBottom: '16px', paddingTop: '4px' }}>
                <button 
                  className={`confirm-proceed-btn ${!bothSidesConfirmed ? 'disabled' : ''}`}
                  onClick={proceedToPayment}
                  disabled={!bothSidesConfirmed}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: bothSidesConfirmed ? '#1B5E20' : '#E0E0E0',
                    color: bothSidesConfirmed ? '#FFFFFF' : '#9E9E9E',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: bothSidesConfirmed ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    boxShadow: bothSidesConfirmed ? '0 4px 12px rgba(27,94,32,0.3)' : 'none'
                  }}
                >
                   {t('chat.confirmAndProceed', 'Confirm & Proceed')}
                </button>
             </div>
          </div>

        </div>
      </div>
      <BottomNav />
    </div>
  );
}
