import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SessionManager from "./utils/SessionManager";

// Auth Pages
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Policy Pages (public)
import TermsConditions from "./pages/TermsConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";

// Customer Pages
import Home from "./pages/Home";
import CropDetails from "./pages/CropDetails";
import FarmerCropDetails from "./pages/FarmerCropDetails";
import Cart from "./pages/Cart";
import TransportDealers from "./pages/TransportDealers";
import Chat from "./pages/Chat";
import Payment from "./pages/Payment";
import MyOrders from "./pages/MyOrders";
import Account from "./pages/Account";
import DeliveryStatus from "./pages/DeliveryStatus";
import SupportChat from "./pages/SupportChat";

import FarmerDashboard from "./farmer/FarmerDashboard";
import AddCrop from "./farmer/AddCrop";
import CropChatbot from "./farmer/CropChatbot";
import FarmerOrders from "./farmer/FarmerOrders";
import FarmerAccount from "./farmer/FarmerAccount";
import MyCrops from "./farmer/MyCrops";
import FarmerLayout from "./farmer/FarmerLayout";

import TransportDealerDashboard from "./transport-dealer/TransportDealerDashboard";
import TransportDealerAccount from "./transport-dealer/TransportDealerAccount";
import TransportDealerOrders from "./transport-dealer/TransportDealerOrders";
import TransportDealerPayments from "./transport-dealer/TransportDealerPayments";
import TransportDealerEarnings from "./transport-dealer/TransportDealerEarnings";
import TransportDealerVehicles from "./transport-dealer/TransportDealerVehicles";
import TransportDealerMessages from "./transport-dealer/TransportDealerMessages";
import TransportDealerRequests from "./transport-dealer/TransportDealerRequests";
import TransportDealerActiveTrips from "./transport-dealer/TransportDealerActiveTrips";
import TransportDealerNotifications from "./transport-dealer/TransportDealerNotifications";
import TransportDealerServiceArea from "./transport-dealer/TransportDealerServiceArea";
import TransportDealerVehicleDetails from "./transport-dealer/TransportDealerVehicleDetails";

// Admin Pages
import AdminDashboard from "./admin/AdminDashboard";
import FarmersManagement from "./admin/FarmersManagement";
import CustomersManagement from "./admin/CustomersManagement";
import TransportDealersManagement from "./admin/TransportDealersManagement";
import OrdersMonitoring from "./admin/OrdersMonitoring";
import PaymentsSettlements from "./admin/PaymentsSettlements";
import ComplaintsSupport from "./admin/ComplaintsSupport";
import Reports from "./admin/Reports";
import AdminAccount from "./admin/AdminAccount";
import AdminBottomNav from "./admin/AdminBottomNav";

import RequireRole from "./components/RequireRole";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Initialize SessionManager on app startup
    console.log('🚀 App starting - Initializing SessionManager');
    SessionManager.startSessionMonitoring();

    // Restore session from localStorage
    const session = SessionManager.getSession();
    if (session) {
      setUser(session.user);
      console.log(`✅ Session restored: ${session.user.name} (${session.role})`);
    }
  }, []);

  const AdminWrapper = ({ children }) => {
    return (
      <>
        {children}
        <AdminBottomNav />
      </>
    );
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Welcome */}
        <Route path="/" element={<Welcome />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />

        {/* Customer Flow */}
        <Route path="/home" element={<RequireRole role="customer"><Home /></RequireRole>} />
        <Route path="/crop-details" element={<RequireRole role="customer"><CropDetails /></RequireRole>} />
        <Route path="/farmer-crop-details" element={<RequireRole role="customer"><FarmerCropDetails /></RequireRole>} />
        <Route path="/cart" element={<RequireRole role="customer"><Cart /></RequireRole>} />
        <Route path="/transport-dealers" element={<RequireRole role="customer"><TransportDealers /></RequireRole>} />
        <Route path="/chat" element={<RequireRole role="customer"><Chat /></RequireRole>} />
        <Route path="/payment" element={<RequireRole role="customer"><Payment /></RequireRole>} />
        <Route path="/orders" element={<RequireRole role="customer"><MyOrders /></RequireRole>} />
        <Route path="/account" element={<RequireRole role="customer"><Account /></RequireRole>} />
        <Route path="/delivery-status/:orderId" element={<RequireRole role="customer"><DeliveryStatus /></RequireRole>} />
        <Route path="/support" element={<RequireRole role="customer"><SupportChat /></RequireRole>} />

        {/* Farmer Flow */}
        <Route path="/farmer-dashboard" element={<RequireRole role="farmer"><FarmerLayout><FarmerDashboard /></FarmerLayout></RequireRole>} />
        <Route path="/farmer/add-crop" element={<RequireRole role="farmer"><FarmerLayout><AddCrop /></FarmerLayout></RequireRole>} />
        <Route path="/farmer/orders" element={<RequireRole role="farmer"><FarmerLayout><FarmerOrders /></FarmerLayout></RequireRole>} />
        <Route path="/farmer/chatbot" element={<RequireRole role="farmer"><FarmerLayout><CropChatbot /></FarmerLayout></RequireRole>} />
        <Route path="/farmer/account" element={<RequireRole role="farmer"><FarmerLayout><FarmerAccount /></FarmerLayout></RequireRole>} />
        <Route path="/farmer/my-crops" element={<RequireRole role="farmer"><FarmerLayout><MyCrops /></FarmerLayout></RequireRole>} />
        <Route path="/farmer-account" element={<RequireRole role="farmer"><FarmerLayout><FarmerAccount /></FarmerLayout></RequireRole>} />
        <Route path="/farmer/support" element={<RequireRole role="farmer"><FarmerLayout><SupportChat /></FarmerLayout></RequireRole>} />

        {/* Transport Dealer Flow */}
        <Route path="/transport-dealer-dashboard" element={<RequireRole role="transport dealer"><TransportDealerDashboard /></RequireRole>} />
        <Route path="/transport-dealer/dashboard" element={<RequireRole role="transport dealer"><TransportDealerDashboard /></RequireRole>} />
        <Route path="/transport-dealer/account" element={<RequireRole role="transport dealer"><TransportDealerAccount /></RequireRole>} />
        <Route path="/transport-dealer/orders" element={<RequireRole role="transport dealer"><TransportDealerOrders /></RequireRole>} />
        <Route path="/transport-dealer/payments" element={<RequireRole role="transport dealer"><TransportDealerPayments /></RequireRole>} />
        <Route path="/transport-dealer/earnings" element={<RequireRole role="transport dealer"><TransportDealerEarnings /></RequireRole>} />
        <Route path="/transport-dealer/vehicles" element={<RequireRole role="transport dealer"><TransportDealerVehicles /></RequireRole>} />
        <Route path="/transport-dealer/service-area" element={<RequireRole role="transport dealer"><TransportDealerServiceArea /></RequireRole>} />
        <Route path="/transport-dealer/vehicle-details" element={<RequireRole role="transport dealer"><TransportDealerVehicleDetails /></RequireRole>} />
        <Route path="/transport-dealer/messages" element={<RequireRole role="transport dealer"><TransportDealerMessages /></RequireRole>} />
        <Route path="/transport-dealer/requests" element={<RequireRole role="transport dealer"><TransportDealerRequests /></RequireRole>} />
        <Route path="/transport-dealer/active-trips" element={<RequireRole role="transport dealer"><TransportDealerActiveTrips /></RequireRole>} />
        <Route path="/transport-dealer/notifications" element={<RequireRole role="transport dealer"><TransportDealerNotifications /></RequireRole>} />
        <Route path="/transport-dealer/support" element={<RequireRole role="transport dealer"><SupportChat /></RequireRole>} />

        {/* Admin Flow */}
        <Route path="/admin" element={<RequireRole role="admin"><AdminWrapper><AdminDashboard user={user} /></AdminWrapper></RequireRole>} />
        <Route path="/admin/farmers" element={<RequireRole role="admin"><AdminWrapper><FarmersManagement /></AdminWrapper></RequireRole>} />
        <Route path="/admin/customers" element={<RequireRole role="admin"><AdminWrapper><CustomersManagement /></AdminWrapper></RequireRole>} />
        <Route path="/admin/dealers" element={<RequireRole role="admin"><AdminWrapper><TransportDealersManagement /></AdminWrapper></RequireRole>} />
        <Route path="/admin/orders" element={<RequireRole role="admin"><AdminWrapper><OrdersMonitoring /></AdminWrapper></RequireRole>} />
        <Route path="/admin/payments" element={<RequireRole role="admin"><AdminWrapper><PaymentsSettlements /></AdminWrapper></RequireRole>} />
        <Route path="/admin/complaints" element={<RequireRole role="admin"><AdminWrapper><ComplaintsSupport /></AdminWrapper></RequireRole>} />
        <Route path="/admin/reports" element={<RequireRole role="admin"><AdminWrapper><Reports /></AdminWrapper></RequireRole>} />
        <Route path="/admin/account" element={<RequireRole role="admin"><AdminWrapper><AdminAccount user={user} setUser={setUser} /></AdminWrapper></RequireRole>} />

        {/* Legacy / shorter paths redirect to canonical */}
        <Route path="/transport-dashboard" element={<Navigate to="/transport-dealer-dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

