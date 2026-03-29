import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../utils/api";
import TransportDealerBottomNav from "./TransportDealerBottomNav";
import "../styles/TransportDealerReviews.css";

export default function TransportDealerReviews() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("registeredUser"));
  const [filterRating, setFilterRating] = useState("All");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch reviews from completed orders
    const fetchReviews = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch delivered orders that may have reviews
        const orders = await apiGet("orders?status=Delivered");
        // Convert orders with feedback to reviews format
        const reviewsData = orders
          .filter(order => order.feedback)
          .map(order => ({
            id: order._id,
            orderId: order._id,
            customerName: order.customerId?.name || "Customer",
            rating: order.feedback?.rating || 5,
            comment: order.feedback?.comment || "Great service!",
            date: order.updatedAt || order.createdAt,
            amount: order.summary?.total || 0,
          }));
        setReviews(reviewsData);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const dealerReviews = useMemo(() => {
    return reviews; // Already filtered for this dealer by backend
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (filterRating === "All") return dealerReviews;
    return dealerReviews.filter((r) => r.rating === parseInt(filterRating));
  }, [dealerReviews, filterRating]);

  const stats = useMemo(() => {
    const total = dealerReviews.length;
    const avgRating =
      total > 0
        ? (
            dealerReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total
          ).toFixed(1)
        : 0;
    const ratingCounts = {
      5: dealerReviews.filter((r) => r.rating === 5).length,
      4: dealerReviews.filter((r) => r.rating === 4).length,
      3: dealerReviews.filter((r) => r.rating === 3).length,
      2: dealerReviews.filter((r) => r.rating === 2).length,
      1: dealerReviews.filter((r) => r.rating === 1).length,
    };

    return { total, avgRating, ratingCounts };
  }, [dealerReviews]);

  const renderStars = (rating) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  return (
    <div className="transport-dealer-reviews">
      {/* Header */}
      <div className="reviews-header">
        <h2>⭐ Reviews & Ratings</h2>
        <button
          className="back-btn"
          onClick={() => navigate("/transport-dealer-dashboard")}
        >
          ← Back
        </button>
      </div>

      {/* Rating Summary */}
      <div className="rating-summary">
        <div className="rating-overview">
          <div className="overall-rating">
            <div className="rating-number">{stats.avgRating}</div>
            <div className="rating-stars">
              {renderStars(Math.round(stats.avgRating))}
            </div>
            <div className="rating-count">Based on {stats.total} reviews</div>
          </div>

          <div className="rating-breakdown">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="rating-row">
                <div className="stars">{"★".repeat(star)}</div>
                <div className="bar">
                  <div
                    className="fill"
                    style={{
                      width: `${stats.total > 0 ? (stats.ratingCounts[star] / stats.total) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
                <div className="count">{stats.ratingCounts[star]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {["All", "5", "4", "3", "2", "1"].map((rating) => (
          <button
            key={rating}
            className={`filter-btn ${filterRating === rating ? "active" : ""}`}
            onClick={() => setFilterRating(rating)}
          >
            {rating === "All" ? "All Reviews" : `${rating} Star${rating !== "1" ? "s" : ""}`}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="reviews-list">
        {filteredReviews.length > 0 ? (
          filteredReviews.map((review, idx) => (
            <div key={idx} className="review-card">
              {/* Reviewer Info */}
              <div className="review-header">
                <div className="reviewer-info">
                  <div className="reviewer-avatar">
                    {(review.customerName || "C").charAt(0).toUpperCase()}
                  </div>
                  <div className="reviewer-details">
                    <h4>{review.customerName || "Customer"}</h4>
                    <p className="review-date">
                      📅 {review.date ? new Date(review.date).toLocaleDateString() : new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className={`rating-badge rating-${review.rating}`}>
                  {renderStars(review.rating)}
                </div>
              </div>

              {/* Review Trip Details */}
              <div className="trip-reference">
                <span className="badge">Trip #{review.tripId}</span>
                <span className="badge route">
                  {review.pickupLocation} → {review.deliveryLocation}
                </span>
              </div>

              {/* Review Comment */}
              <div className="review-content">
                <h5>Feedback</h5>
                <p>{review.comment || "No comment provided"}</p>
              </div>

              {/* Review Highlights */}
              {review.highlights && review.highlights.length > 0 && (
                <div className="review-highlights">
                  <h5>Highlights</h5>
                  <div className="highlights-list">
                    {review.highlights.map((highlight, i) => (
                      <span key={i} className="highlight-tag">
                        ✓ {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Response Status */}
              <div className="review-footer">
                {review.dealerResponse ? (
                  <div className="response">
                    <p className="response-label">Your Response:</p>
                    <p className="response-text">{review.dealerResponse}</p>
                  </div>
                ) : (
                  <button className="respond-btn">
                    💬 Write Response
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">⭐</div>
            <p>No reviews yet</p>
            <small>Complete deliveries to receive reviews from customers</small>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <TransportDealerBottomNav />
    </div>
  );
}
