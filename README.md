# 💰 BillSplitter

A full-stack multi-currency bill splitting web app. Split expenses with friends across different currencies, automatically calculate who owes whom, and settle balances — all with Google OAuth sign-in.

## ✨ Features

- **Google OAuth Sign-In** — One-click login with your Google account
- **Multi-Currency Support** — Track expenses in USD, EUR, GBP, INR with automatic conversion
- **Group Management** — Create groups for trips, roommates, dinners, etc.
- **Smart Balance Calculation** — Greedy algorithm minimizes the number of transactions needed
- **Settlement Tracking** — Mark debts as settled with one click
- **Responsive Dark UI** — Modern dark charcoal theme with amber accents

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Google OAuth |
| **Backend** | Java 17, Spring Boot 3.2, Spring Security, JWT |
| **Database** | MySQL 8 |
| **Auth** | JWT + Google OAuth 2.0 |
| **Deployment** | Vercel (frontend) + Railway (backend + MySQL) |

## 🏗 Architecture

```
┌──────────────┐     REST API     ┌──────────────────┐     JPA      ┌────────────┐
│   React UI   │ ◄──────────────► │  Spring Boot API │ ◄──────────► │   MySQL    │
│   (Vercel)   │                  │    (Railway)     │              │  (Railway) │
└──────────────┘                  └──────────────────┘              └────────────┘
       │                                   │
  Google OAuth                        JWT Auth
  (Client-Side)                    Token Verification
```

## 🚀 Getting Started

### Prerequisites
- **Java 17+**
- **Node.js 18+**
- **MySQL 8**

### Backend Setup
```bash
cd backend
./mvnw spring-boot:run
```
Server runs on `http://localhost:8080`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
App runs on `http://localhost:5173`

### Environment Variables

**Backend** (`application.properties` or env vars):
| Variable | Description |
|---|---|
| `SPRING_DATASOURCE_URL` | MySQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | Database username |
| `SPRING_DATASOURCE_PASSWORD` | Database password |
| `JWT_SECRET` | Secret key for JWT signing |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |

**Frontend** (`.env`):
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |

## 📁 Project Structure

```
billsplitter/
├── backend/
│   └── src/main/java/com/billsplitter/
│       ├── controller/       # REST API endpoints
│       ├── entity/           # JPA entities (User, Group, Expense...)
│       ├── repository/       # Spring Data repositories
│       ├── security/         # JWT + Security config
│       ├── service/          # Business logic
│       └── dto/              # Request/Response DTOs
├── frontend/
│   └── src/
│       ├── App.jsx           # Main React component
│       ├── App.css           # Component styles
│       ├── index.css         # Design system tokens
│       └── main.jsx          # Entry point + Google OAuth provider
└── docker-compose.yml
```

## 📄 License

This project is for educational and portfolio purposes.
