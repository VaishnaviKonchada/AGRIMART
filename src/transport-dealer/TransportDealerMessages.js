import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TransportDealerBottomNav from "./TransportDealerBottomNav";
import { apiGet, apiPost } from "../utils/api";
import "../styles/TransportDealerMessages.css";
const MINIMUM_MANUAL_OFFER = 15;
export default function TransportDealerMessages() {
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("registeredUser") || "{}");
  const userId = user._id || user.id;
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(location.state?.chatId || null);
  const [messageText, setMessageText] = useState("");
  const [showPriceNegotiation, setShowPriceNegotiation] = useState(false);
  const [finalPrice, setFinalPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const selectedChat = chats.find(c => c._id === selectedChatId) || null;
  const getEffectiveFinalPrice = chat => {
    if (!chat) return null;
    if (chat.negotiation?.finalPrice) return Number(chat.negotiation.finalPrice);
    const messages = Array.isArray(chat.messages) ? [...chat.messages] : [];
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const text = messages[i]?.text || "";
      const match = text.match(/(?:Final Price Offer:|Customer counter-offer:)\s*Rs\.?\s*(\d+(?:\.\d+)?)/i);
      if (match) {
        return Number(match[1]);
      }
    }
    return null;
  };
  const effectiveFinalPrice = getEffectiveFinalPrice(selectedChat);
  const loadChats = async () => {
    try {
      setApiError("");
      const data = await apiGet("chats");
      const list = Array.isArray(data) ? data : [];
      setChats(list);
      if (!selectedChatId && list.length > 0) {
        setSelectedChatId(list[0]._id);
      }
      if (selectedChatId && !list.some(c => c._id === selectedChatId) && list.length > 0) {
        setSelectedChatId(list[0]._id);
      }
    } catch (error) {
      console.error("Error fetching chats:", error.message);
      setApiError(error.message || "Failed to load chats");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 2000);
    return () => clearInterval(interval);
  }, []);
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat) {
      return;
    }
    try {
      await apiPost(`chats/${selectedChat._id}/message`, {
        text: messageText.trim()
      });
      setMessageText("");
      await loadChats();
    } catch (error) {
      console.error("Error sending message:", error.message);
      alert(`Failed to send message: ${error.message}`);
    }
  };
  const handleSendFinalPrice = async () => {
    if (!finalPrice || !selectedChat) {
      alert("Please enter a final price");
      return;
    }
    const priceAmount = parseFloat(finalPrice);
    if (Number.isNaN(priceAmount) || priceAmount < MINIMUM_MANUAL_OFFER) {
      alert(`Please enter a valid price of at least ₹${MINIMUM_MANUAL_OFFER}`);
      return;
    }
    try {
      await apiPost(`chats/${selectedChat._id}/message`, {
        text: `Final Price Offer: ₹${priceAmount}`
      });
      setFinalPrice("");
      setShowPriceNegotiation(false);
      await loadChats();
    } catch (error) {
      console.error("Error sending price:", error.message);
      alert(`Failed to send price: ${error.message}`);
    }
  };
  const handlePriceDecision = async decision => {
    if (!selectedChat) return;
    try {
      const data = await apiPost(`chats/${selectedChat._id}/price-decision`, {
        decision
      });
      await loadChats();
      if (decision === "confirm" && data?.bothConfirmed) {
        try {
          await apiPost(`chats/${selectedChat._id}/finalize-price`);
        } catch (err) {
          console.warn("Could not finalize agreed price:", err.message);
        }
        alert("Both parties confirmed. Negotiated price is locked for payment.");
      } else if (decision === "confirm") {
        alert("Your confirmation is saved. Waiting for customer confirmation.");
      } else {
        alert("Price rejected. Send a new final offer to continue negotiation.");
      }
    } catch (error) {
      console.error("Error submitting price decision:", error.message);
      alert(`Failed to submit decision: ${error.message}`);
    }
  };
  return <div className="transport-dealer-messages">
      <div className="messages-header">
        <h2>{t("Messages")}</h2>
        <button className="back-btn" onClick={() => navigate("/transport-dealer-dashboard")}>{t("Back")}</button>
      </div>

      <div className="messages-container">
        <div className="chats-list">
          <div className="chats-header">
            <h3>{t("Conversations")} ({chats.length})</h3>
          </div>

          {loading ? <div className="empty-chats">
              <p>{t("Loading chats...")}</p>
            </div> : apiError ? <div className="empty-chats">
              <p>{t("Unable to load chats:")}{apiError}</p>
            </div> : chats.length > 0 ? chats.map(chat => {
          const customerName = chat.customerId?.name || t("Customer");
          const lastMessage = chat.messages?.length > 0 ? chat.messages[chat.messages.length - 1].text : t("No messages yet");
          const lastTime = chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString() : "";
          return <div key={chat._id} className={`chat-item ${selectedChatId === chat._id ? "active" : ""}`} onClick={() => setSelectedChatId(chat._id)}>
                  <div className="chat-avatar">{customerName.charAt(0).toUpperCase()}</div>
                  <div className="chat-info">
                    <div className="chat-name">{customerName}</div>
                    <div className="chat-preview">{t(lastMessage, lastMessage)}</div>
                  </div>
                  <div className="chat-time">{lastTime}</div>
                </div>;
        }) : <div className="empty-chats">
              <p>{t("No conversations yet")}</p>
            </div>}
        </div>

        <div className="chat-window">
          {selectedChat ? <>
              <div className="chat-header">
                <div className="chat-header-info">
                  <h3>{selectedChat.customerId?.name || t("Customer")}</h3>
                  <p>{selectedChat.customerId?.email || ""}</p>
                </div>
                <button className="price-negotiate-btn" onClick={() => setShowPriceNegotiation(!showPriceNegotiation)}>{t("Negotiate")}</button>
              </div>

              <div className="price-negotiation-panel" style={{
            marginBottom: "10px"
          }}>
                <div className="negotiation-header">
                  <h4>{t("Pickup & Drop Details")}</h4>
                </div>
                <div className="price-actions" style={{
              flexDirection: "column",
              gap: "6px"
            }}>
                  <div><strong>{t("Pickup:")}</strong> {selectedChat.dealerRequestId?.pickupLocation || selectedChat.negotiation?.pickup || "-"}</div>
                  <div><strong>{t("Drop:")}</strong> {selectedChat.dealerRequestId?.dropLocation || selectedChat.negotiation?.drop || "-"}</div>
                  <div><strong>{t("Customer Phone:")}</strong> {selectedChat.dealerRequestId?.customerPhone || "-"}</div>
                  <div><strong>{t("Door No:")}</strong> {selectedChat.dealerRequestId?.customerDoorNo || "-"}</div>
                  <div><strong>{t("Address:")}</strong> {selectedChat.dealerRequestId?.customerLocationText || "-"}</div>
                </div>
              </div>

              {showPriceNegotiation && <div className="price-negotiation-panel">
                  <div className="negotiation-header">
                    <h4>{t("Price Negotiation")}</h4>
                    <button className="close-panel-btn" onClick={() => setShowPriceNegotiation(false)}>{t("X")}</button>
                  </div>

                  <div className="price-actions">
                    <div className="final-price-input-group">
                      <input type="number" className="final-price-input" value={finalPrice} min={MINIMUM_MANUAL_OFFER} onChange={e => setFinalPrice(e.target.value)} placeholder={t("Enter your price")} />
                      <button className="send-price-btn" onClick={handleSendFinalPrice}>{t("Send Offer")}</button>
                    </div>
                  </div>
                </div>}

              <div className="messages-area">
                {selectedChat.messages && selectedChat.messages.length > 0 ? selectedChat.messages.map((msg, idx) => {
              const senderId = msg.senderId?._id || msg.senderId;
              const isDealer = String(senderId) === String(userId);
              const messageTime = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString();
              return <div key={idx} className={`message ${isDealer ? "sent" : "received"}`}>
                        <div className="message-content">{t(msg.text, msg.text)}</div>
                        <div className="message-time">{messageTime}</div>
                      </div>;
            }) : <div className="chat-start">
                    <p>{t("Start a conversation")}</p>
                  </div>}
              </div>

              <div className="price-negotiation-panel decision-inline-panel" style={{
            marginTop: "10px"
          }}>
                <div className="negotiation-header">
                  <h4>{t("Final Price Decision")}</h4>
                </div>
                <div className="price-actions" style={{
              flexDirection: "column",
              gap: "8px"
            }}>
                  <div>
                    <strong>{t("Final Price:")}</strong>{" "}
                    {effectiveFinalPrice ? `₹${effectiveFinalPrice}` : t("Not offered yet")}
                  </div>
                  <div><strong>{t("Dealer:")}</strong> {selectedChat.negotiation?.dealerDecision || t("pending")}</div>
                  <div><strong>{t("Customer:")}</strong> {selectedChat.negotiation?.customerDecision || t("pending")}</div>
                  {!effectiveFinalPrice ? <div style={{
                fontSize: "12px",
                color: "#78350f",
                fontWeight: 700
              }}>{t("Send final offer or use customer counter-offer to enable confirm/reject.")}</div> : null}
                  <div style={{
                display: "flex",
                gap: "8px"
              }}>
                    <button className="send-price-btn" disabled={!effectiveFinalPrice} onClick={() => handlePriceDecision("confirm")}>{t("Confirm Price")}</button>
                    <button className="reject-price-btn" disabled={!effectiveFinalPrice} onClick={() => handlePriceDecision("reject")}>{t("Reject Price")}</button>
                  </div>
                </div>
              </div>

              <div className="message-input">
                <input type="text" value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendMessage()} placeholder={t("Type a message...")} />
                <button onClick={handleSendMessage}>{t("Send")}</button>
              </div>
            </> : <div className="no-chat-selected">
              <div className="icon">{t("Chat")}</div>
              <p>{t("Select a conversation to start messaging")}</p>
            </div>}
        </div>
      </div>

      <TransportDealerBottomNav />
    </div>;
}