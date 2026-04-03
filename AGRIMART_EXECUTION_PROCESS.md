# EXECUTION PROCESS OF THE PROJECT
**AGRIMART – AI-POWERED AGRICULTURE MARKETPLACE**

## 1. Project Overview
AgriMart is a comprehensive full-stack AI-enabled platform designed to bridge the gap between farmers, customers, and transport dealers. It provides an all-in-one ecosystem for crop listing, direct marketing, and efficient logistics.
The system leverages AI for crop disease detection and real-time multi-language support, ensuring that farmers can interact with the platform in their native language (English, Hindi, Telugu) while accessing expert-level agricultural insights.

## 2. System Architecture
AgriMart follows a distributed client-server architecture with integrated AI and logistics layers.

### Frontend (Client Layer)
Built using **React.js** and **Bootstrap**, the frontend provides specific dashboards for different user roles (Farmer, Customer, Transport Dealer, Admin). It handles interactive crop browsing, cart management, and real-time negotiation chats.

### Backend / Services Layer
The backend is a **RESTful API** built with **Node.js** and **Express**. It handles authentication (JWT), role-based access control, file uploads (Multer), and integrates with the database and AI proxies.

### AI & Intelligence Layer
- **Gemini AI Integration**: Powers the dynamic translation proxy for multi-language support and the intelligent crop disease diagnosis bot.
- **ML Engine**: A Python/Keras-based engine for specialized plant disease detection models.

### External Integrations
- **Govt Mandi API**: Fetches real-time wholesale price references from data.gov.in.
- **NodeMailer**: Handles automated email notifications for order status and support.
- **i18next**: Manages localization strings for seamless language switching.

## 3. System Requirements
### Hardware Requirements
- Processor: Intel Core i5 or above
- RAM: Minimum 8 GB
- Storage: 128 GB SSD (recommended for ML models)
- Network: Stable internet connection

### Software Requirements
- Operating System: Windows 10/11
- Browser: Chrome / Firefox / Edge
- Node.js: v18 or above
- MongoDB: Community Server or MongoDB Atlas
- Python: 3.8+ (for ML modules)

### Tech Stack
| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React.js, Bootstrap | UI and Responsive Frontend |
| Backend | Node.js, Express | Server-side business logic |
| Database | MongoDB (Mongoose) | Real-time data storage |
| AI Engine | Gemini AI / Python Keras | Disease diagnosis & Translations |
| Localization| i18next | Multi-language (EN, HI, TE) support |
| Security | JWT, Bcrypt.js | Authentication & Authorization |

## 4. Installation Process

### Step 1 — Install Environment
Install Node.js (v18+) and MongoDB. Verify using:
```bash
node --version
npm --version
```

### Step 2 — Project Setup
Clone or extract the AgriMart project folder.
```bash
cd agrimart-client
```

### Step 3 — Install Dependencies
Run in both root and server directories:
```bash
npm install
cd server
npm install
```

### Step 4 — Configuration
Create a `.env` file in the `server` directory and configure:
- `MONGODB_URI`: Your database connection string
- `JWT_SECRET`: Secure key for token generation
- `Gemini_API_KEY`: Google Generative AI key
- `GOVT_CROP_API_KEY`: API key for Mandi prices
- `EMAIL_USER/PASSWORD`: SMTP credentials for notifications

### Step 5 — Database Setup
Start your local MongoDB service or ensure MongoDB Atlas is connected.

## 5. Running the Application
1. **Start Backend**: `cd server && npm start`
2. **Start Frontend**: `npm start` (in root directory)
3. **Open Browser**: `http://localhost:3000`
4. **Login**: Use test credentials or register as Farmer/Customer.

## 6. Execution Flow

### 6.1 Authentication & Role Management
Users register as Farmers, Customers, or Dealers. JWT handles secure session management across device refreshes.

### 6.2 Crop Listing (Farmer)
Farmers upload crop details (Name, Price, Quantity, Quality). The system fetches govt mandi prices as a reference.

### 6.3 Smart Marketplace (Customer)
Customers browse real-time listings with localized names. They add crops to their cart which tracks weights for transport calculations.

### 6.4 AI Disease Detection
Farmers upload images of crop leaves. The Gemini AI/ML assistant analyzes the image and provides diagnosis and treatment suggestions.

### 6.5 Transport Negotiation
When a customer checks out, they select a Transport Dealer. Real-time chat allows negotiation of delivery rates between the parties.

### 6.6 Multi-Language Support
The entire UI translates dynamically based on user selection. Missing keys are auto-translated using the Gemini AI proxy.

### 6.7 Order Processing
Orders transition through states (Pending, Confirmed, In-Transit, Delivered) with email updates sent to all stakeholders.

## 7. Key Features & Rules
- **Direct Trade**: Eliminates middle-men for better farmers' margins.
- **Mandi References**: Real government data prevents price manipulation.
- **AI-Doctor**: Instant crop health diagnostics for farmers.
- **Secure Payments**: Orders only proceed after dealer and customer agreement.

## 8. Conclusion
AgriMart successfully integrates modern web technologies with AI to revolutionize the agricultural supply chain, empowering rural farmers with digital tools in their own language.
