# AgriMart - AI-Powered Agriculture Marketplace

AgriMart is a comprehensive full-stack ecosystem designed to empower farmers and streamline the agricultural supply chain using modern technology and Artificial Intelligence.

## 🚀 Key Features

*   **Smart Marketplace**: Direct trade between farmers and customers in multiple languages (English, Hindi, Telugu).
*   **AI Crop Assistant**: Real-time diagnosis of crop diseases using Gemini AI and ML models.
*   **Logistics & Negotiation**: Integrated transport dealer network with real-time bidding and chat.
*   **Mandi Price References**: Dynamic government price data integration for fair trading.
*   **Role-Based Dashboards**: Specialized interfaces for Farmers, Customers, Transport Dealers, and Admins.

## 🛠️ Project Structure

*   **/src**: React.js frontend source code.
*   **/server**: Node.js/Express backend API.
*   **/server/ml**: Python-based machine learning modules for disease detection.
*   **/server/data**: Essential dataset used for location and mandi mapping.

## 📖 Essential Documentation

For detailed technical overview, installation guides, and execution flows, please refer to:
👉 **[AGRIMART_EXECUTION_PROCESS.md](./AGRIMART_EXECUTION_PROCESS.md)**

## 🚦 Quick Start

1.  **Environment**: Ensure Node.js and MongoDB are installed.
2.  **Installation**: Run `npm install` in both the root and `/server` directory.
3.  **Config**: Set up your `.env` in the `/server` directory (see `server/.env.example`).
4.  **Run**:
    *   Backend: `cd server && npm start`
    *   Frontend: `npm start` (root directory)

---
*Developed for the modern agricultural ecosystem.*
