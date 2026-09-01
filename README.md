# 🚀 Employee Management System (EMS)

> A powerful, enterprise-grade MERN Stack platform with Role-Based Access Control (RBAC), Attendance Tracking, Leave Approvals, Dynamic Payroll, Task Delegation, Recruitment Pipelines, and Real-time SSE Notifications.

---

## 📌 Project Overview

The **Employee Management System (EMS)** is designed to streamline workplace management and HR operations. It provides customized dashboards and capabilities tailored for **Admins**, **HR Personnel**, **Managers**, and **Employees**.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React.js 19, Vite, React Router 7 | Responsive, high-performance Single Page Application (SPA) |
| **Styling** | Vanilla CSS, Lucide React Icons | Dark/Light themes, modern glassmorphism UI |
| **Backend** | Node.js, Express.js | High-concurrency RESTful API server |
| **Database** | MongoDB, Mongoose ODM | Relational-like document schema modeling |
| **Real-time** | Server-Sent Events (SSE) | Low-latency live notification & activity stream |
| **Security** | JSON Web Tokens (JWT), bcryptjs | Stateless authorization & password hashing |

---

## 🌟 Key Features & Modules

### 🔐 1. Role-Based Access Control (RBAC)
- Customized views and action privileges for **Admin**, **HR**, **Manager**, and **Employee** roles.
- Protected API routes and client-side route guards.

### ⏱️ 2. Attendance & Regularization
- Live clock-in / clock-out logging with automated duration calculation.
- Attendance regularization request & approval workflow for missed punches.

### 🌴 3. Leave Approval Management
- Real-time leave balance computation across leave types (Casual, Sick, Paid).
- Application submission with manager approval/rejection routing.

### 💵 4. Dynamic Payroll Engine & Payslips
- Automatic computation of Base Salary, Allowances, Performance Bonuses, and Deductions.
- Instant digital payslip preview and download.

### 📋 5. Task Delegation & Performance Rating
- Interactive task board with status progression, priority, and deadlines.
- Structured performance evaluation reviews with rating feedback.

### 🤝 6. Recruitment Pipeline (ATS) & Assets
- Candidate tracking from initial application to interview and offer stages.
- Hardware asset request and allocation lifecycle management.

### 🔔 7. Real-time Notifications (SSE)
- Instant alerts for leave approvals, task assignments, and organizational announcements.

---

## 📁 Project Structure

```
Employee Management System/
├── backend/
│   ├── config/             # DB & server configuration
│   ├── controllers/        # Business logic controllers
│   ├── middleware/         # Auth, RBAC & error handlers
│   ├── models/             # Mongoose DB schemas
│   ├── routes/             # Express REST API routes
│   ├── server.js           # Express app entrypoint
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI widgets & components
│   │   ├── context/        # Auth & Theme context providers
│   │   ├── hooks/          # Custom hooks (SSE notifications)
│   │   ├── pages/          # Full page views (Dashboard, Attendance, etc.)
│   │   ├── utils/          # Axios/fetch API helpers
│   │   ├── App.jsx         # App router & routes
│   │   └── main.jsx        # Entry point
│   ├── index.html
│   └── package.json
├── .gitignore
└── README.md
```

---

## 💻 Quick Start & Installation

### Prerequisites
- **Node.js**: v18+
- **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017`

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5000`*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 📄 License & Author

Developed by **[Mahesh Vaishnav](https://github.com/maheshvaishnav34)**.
