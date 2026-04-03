AGRIMART – AI-POWERED AGRICULTURE MARKETPLACE FOR FARMERS AND CONSUMERS

1. PROJECT OVERVIEW
AgriMart is a full-stack web application designed to bridge the gap between farmers, consumers, and transport dealers. The platform enables farmers to list crops with government mandi price references, allows customers to purchase fresh produce directly, and integrates transport dealers for logistics. The system features an AI-powered crop health assistant for disease diagnosis and real-time multi-language support (English, Hindi, Telugu) to ensure accessibility for rural users.

2. SYSTEM REQUIREMENTS
• Node.js v18 or higher — Required for running the frontend and backend servers.
• MongoDB — Active database for storing users, crops, and transaction details.
• Active internet connection — Essential for Gemini AI services, Govt Mandi API, and email notifications.
• Any modern browser: Chrome, Firefox, Edge, or Safari.
• Minimum 8 GB RAM recommended for smooth execution of AI and backend processes.

3. TECH STACK
Layer	Technology	Purpose
Frontend	React.js, Bootstrap, Vanilla CSS	UI and client-side logic
Backend	Node.js, Express.js	Server-side processing and REST API
Database	MongoDB (Mongoose)	NoSQL data storage
AI Engine	Gemini AI (Google)	Disease diagnosis & Translate proxy
Localization	i18next	Multi-language (EN, HI, TE) support
Authentication	JWT, Bcrypt	Secure login and session management
Tools	VS Code, MongoDB Compass, npm	Development and database管理

4. SYSTEM ARCHITECTURE
AgriMart follows a modern three-tier MERN-style architecture consisting of a React frontend, a Node/Express backend, and a MongoDB database. The frontend communicates with the backend via RESTful APIs using Axios. The backend processes business logic, interacts with the MongoDB database for persistent storage, and utilizes external AI proxies for intelligent features like crop diagnosis and dynamic translations.

5. MODULES OVERVIEW
• Authentication Module – Handles role-based registration and login for Farmers, Customers, and Dealers.
• Farmer Dashboard Module – Manages crop listings, stock availability, and government price references.
• Marketplace Module – Enables customers to browse available crops with real-time localized names.
• AI Health Module – Provides leaf-based disease diagnosis and farming recommendations via Gemini AI.
• Logistics & Chat Module – Facilitates real-time negotiation and coordination between customers and transport dealers.
• Order Management Module – Tracks the lifecycle of crops from pending to confirmed and delivered.
• Admin Desk Module – Centralized support system for handling user complaints and platform management.

6. INSTALLATION STEPS
Step 1 — Install Environment
Download and install Node.js (v18+) and ensure MongoDB is running locally or via MongoDB Atlas.
Step 2 — Setup Project
Extract the AgriMart project and navigate to the root directory. Install dependencies for both the frontend and the backend:
npm install
cd server
npm install
Step 3 — Configure Environment Variables
Create a .env file in the /server directory and add your credentials:
PORT=8081
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
Gemini_API_KEY=your_google_ai_key
Step 4 — Setup Frontend Config
Ensure the root .env file points to your local or deployed backend:
REACT_APP_API_URL=http://localhost:8081/api
Step 5 — Run the Application
Start the backend first, followed by the frontend:
Backend: cd server && npm start
Frontend: npm start (in a separate terminal)

7. RUNNING THE APPLICATION
The application requires two active processes:
• Start the Node.js server to handle API requests.
• Start the React development server to view the interface.
• Ensure MongoDB is connected and the AI API keys are valid.

8. EXECUTION FLOW
8.1 User Registration and Role Selection
1.	User visits the landing page and selects a role (Farmer, Customer, or Dealer).
2.	Enters details including email, password, and location (State/District/Mandal).
3.	The system hashes the password and stores the profile in MongoDB.
4.	User logs in to receive a JWT (JSON Web Token) stored in the browser session.
5.	User is redirected to their specific role-based dashboard.

8.2 Crop Listing (Farmer)
1.	Farmer selects 'Add Crop' from their dashboard.
2.	Enters crop details; the system fetches real-time Govt Mandi rates for price reference.
3.	Farmer uploads photos and specifies the harvest date and quantity.
4.	The crop is listed on the marketplace and becomes visible to customers.

8.3 Smart Marketplace and Buying (Customer)
1.	Logged-in Customer browses crops localized in their selected language.
2.	Adds items to the cart; the system calculates the total weight for transport logistics.
3.	Customer chooses a delivery location using GPS or address search.
4.	Selects an available Transport Dealer and sends a delivery request.

8.4 AI Disease Diagnosis
1.	Farmer/User visits the AI Assistant section.
2.	Uploads an image of a crop leaf; the Gemini AI model analyzes the image.
3.	System provides a diagnosis, confidence score, and specific treatment recommendations.
4.	Users can ask follow-up questions about fertilizers or irrigation.

8.5 Logistics and Negotiation
1.	Transport Dealers receive delivery requests on their dashboard.
2.	Dealer and Customer use the real-time chat to negotiate the delivery price.
3.	Once both parties confirm, the customer proceeds to final order placement.
4.	Order status is updated, and the farmer is notified to prepare the harvest for pickup.

9. KEY RULES
• Every user must choose exactly one role (Farmer, Customer, or Dealer).
• Crop listings require valid price and quantity data.
• Transport negotiations must be confirmed by both parties before order finalization.
• AI diagnosis requires a clear image of the affected plant leaf.
• Access to secure pages is restricted to users with a valid JWT session.

10. DEPLOYMENT
The application is designed for cloud scalability and can be deployed on various platforms.
Layer	Platform	URL (Current)
Frontend	Vercel / Netlify	https://agrimartfrontend.vercel.app
Backend	Render / Railway	https://agrimartbackend.vercel.app
Database	MongoDB Atlas	Cloud Instance

For production, the Frontend is built using npm run build, and the Backend is hosted on a cloud environment where the .env variables are securely managed in the platform settings.
