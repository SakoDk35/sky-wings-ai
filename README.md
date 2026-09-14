# ✈️ Sky Wings AI Travel

**A next-generation travel intelligence platform that combines real-time flight data, machine learning price forecasting, and AI-driven trip planning — all in one seamless interface.**

Sky Wings goes beyond a simple flight search tool. It gives travelers the context they need to book with confidence: is this price actually a good deal, is this destination safe to visit right now, and what should a perfect itinerary look like? Sky Wings answers all three, backed by real data and transparent reasoning rather than black-box guesses.

---

## 🌍 Overview

Sky Wings AI Travel is a full-stack travel platform built for modern travelers who want more than a list of flights. It integrates live flight search via the **Amadeus API**, conversational and generative capabilities via **Google Gemini**, and two custom intelligence engines — a **Price Intelligence Engine** and a **Travel Risk Engine** — that produce fast, deterministic, explainable insights without relying purely on opaque AI outputs.

The result is a platform that tells you not just *what* flights exist, but *whether* the price is fair, *how* risky the destination is this time of year, and *what* your trip could actually look like day-by-day — complete with an interactive AI travel assistant to answer questions along the way.

---

## ✨ Key Features

- **🔍 Real-Time Flight Search** — Live flight offers sourced from the Amadeus API, with automatic fallback to AI-generated results when needed, ensuring search always returns useful data.
- **💰 Price Intelligence Engine** — Deterministic, math-driven price classification (Great Deal → Expensive) benchmarked against real-time market averages, not just AI guesswork.
- **🤖 ML Price Prediction** — A dedicated Python/Flask microservice trained on flight pricing data (Linear Regression, Random Forest, Gradient Boosting) forecasts future price trends with confidence scoring.
- **🛡️ Travel Risk Engine** — Rule-based safety and weather-risk scoring per destination, factoring in seasonality, political stability, and historical travel patterns.
- **🗺️ AI Trip Itinerary Planner** — Generates detailed, day-by-day itineraries tailored to destination, trip length, season, and personal interests, rendered in a polished document-style UI.
- **💬 Conversational AI Assistant** — An embedded chat assistant (powered by Gemini) that answers flight, safety, and travel-planning questions in real time with streaming responses.
- **🧭 Interactive Flight Path Visualization** — Live map rendering of flight routes and a clean visual timeline of departure, layovers, and arrival.
- **🌐 Bilingual & RTL-Ready** — Full English/Arabic support with native right-to-left layout handling.

---

## 🛠️ Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Recharts (data visualization)
- Leaflet & React-Leaflet (interactive maps)
- Lucide React (icons)

**Backend**
- Node.js + Express
- better-sqlite3 (search logging & validation)

**AI & Machine Learning**
- Google Gemini (`@google/genai`) — conversational assistant & generative itinerary planning
- Python + Flask microservice for ML price prediction
- scikit-learn (Linear Regression, Random Forest, Gradient Boosting)

**External APIs**
- Amadeus Flight Offers API (real-time flight data)

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+
- Python 3.9+ (optional, only for ML price predictions)
- A [Google Gemini API key](https://aistudio.google.com/)
- (Optional) [Amadeus API](https://developers.amadeus.com/) test credentials for real flight data

### 1. Clone & Install
\`\`\`bash
git clone https://github.com/your-username/sky-wings-ai-travel.git
cd sky-wings-ai-travel
npm install
\`\`\`

### 2. Configure Environment Variables
Create a `.env.local` file in the project root:
\`\`\`env
GEMINI_API_KEY=your_gemini_api_key
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
\`\`\`

### 3. Run the App
Start the frontend and backend together:
\`\`\`bash
npm run dev:all
\`\`\`
Or run them separately:
\`\`\`bash
npm run server   # Express + SQLite backend on :3001
npm run dev      # Vite frontend on :3000
\`\`\`

### 4. (Optional) Enable ML Price Predictions
\`\`\`bash
cd ml-price-predictor
pip install -r requirements.txt
python train_models.py
python app.py     # Flask ML service on :5000
\`\`\`

### 5. Open the App
Visit **http://localhost:3000** and start exploring.

---

## 📄 License
Add your license of choice here (MIT, Apache 2.0, etc.).
