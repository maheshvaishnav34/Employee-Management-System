# Backend Documentation: EMS Hub Server Architecture

This document provides a comprehensive technical guide to the backend architecture, database schemas, API routing structure, and authorization layers of the Employee Management System (EMS Hub) server.

---

## 1. System Overview & Tech Stack
The backend is a high-performance Node.js Express server connected to a MongoDB database using the Mongoose Object-Document Mapper (ODM). It handles session security, data storage, operational workflows, audit trails, and system backups.

- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JSON Web Token (JWT) via Bearer headers and cookie injection.
- **Security**: BCrypt hashing for credentials, CORS protection, custom role-based route guard authorization middleware.

---

## 2. Database Models (Mongoose Schemas)
The database registry contains **23 distinct schemas** managing personnel, metrics, chat, and system actions:

| Schema Name | Target File | Core Responsibilities | Key Fields & Type Schemas |
| :--- | :--- | :--- | :--- |
| **User** | `User.js` | System login accounts | `username`, `email`, `password` (hashed), `role` (`admin`, `hr`, `manager`, `employee`), `employee` (Ref Employee) |
| **Employee** | `Employee.js` | Personnel profiles & details | `employeeId` (unique), `firstName`, `lastName`, `email`, `phone`, `dateOfBirth`, `gender`, `joiningDate`, `department` (Ref Department), `designation`, `salary`, `status` (Active/Inactive), `skills` |
| **Department** | `Department.js` | Corporate divisions | `name`, `description`, `manager` (Ref Employee) |
| **Designation** | `Designation.js` | Job titles | `title`, `department` (Ref Department), `description` |
| **Attendance** | `Attendance.js` | Clock-in/out timestamps | `employee` (Ref Employee), `date` (midnight date-only), `clockIn`, `clockOut`, `status` (Present, Late, Absent), `workMode` (Office/WFH), `totalHours` |
| **AttendanceRegularization** | `AttendanceRegularization.js` | Timesheet correction claims | `employee` (Ref Employee), `date`, `clockIn`, `clockOut`, `reason`, `status` (Pending, Approved, Rejected), `remarks`, `approvedBy` (Ref User) |
| **LeaveRequest** | `LeaveRequest.js` | Time-off bookings | `employee` (Ref Employee), `leaveType` (Sick, Casual, Maternity, Unpaid, etc.), `startDate`, `endDate`, `reason`, `status` (Pending, Approved, Rejected), `comments`, `approvedBy` (Ref User) |
| **Payroll** | `Payroll.js` | Payslip summaries | `employee` (Ref Employee), `month` (e.g. "June 2026"), `baseSalary`, `allowances`, `deductions`, `netSalary`, `status` (Paid, Unpaid), `paymentDate` |
| **PerformanceReview** | `PerformanceReview.js` | Star reviews & evaluations | `employee` (Ref Employee), `reviewer` (Ref Employee), `rating` (1-5), `feedback`, `reviewPeriod`, `createdAt` |
| **Task** | `Task.js` | Assignments & checkboards | `title`, `description`, `assignedTo` (Ref Employee), `assignedBy` (Ref User), `status` (Pending, In Progress, Completed, Cancelled), `priority` (Low, Medium, High, Critical), `progress` (0-100), `dueDate` |
| **AuditLog** | `AuditLog.js` | Security trail logs | `action` (e.g., CREATE_EMPLOYEE), `entity`, `entityId`, `performedBy` (Ref User), `details`, `createdAt` |
| **ChatMessage** | `ChatMessage.js` | Live chat messages | `sender` (Ref User), `content`, `createdAt` |
| **CompanyDocument** | `CompanyDocument.js` | Policy publications | `title`, `description`, `category`, `content` (file/text), `isGlobal` (boolean), `uploadedBy` (Ref User) |
| **Asset** | `Asset.js` | Company equipment inventory | `name`, `type`, `assetId`, `serialNumber`, `assignedTo` (Ref Employee), `status` (Available, Assigned, Maintenance) |
| **AssetRequest** | `AssetRequest.js` | Hardware allocation request | `employee` (Ref Employee), `assetType`, `reason`, `status`, `remarks` |
| **Mood** | `Mood.js` | Wellbeing mood index | `employee` (Ref Employee), `score` (1-5), `date` |
| **Poll** | `Poll.js` | Interactive votes | `question`, `options` (text/votes), `active` (boolean), `votedBy` (array of refs) |
| **Reward** | `Reward.js` | Awards recognitions | `employee` (Ref Employee), `title`, `points`, `reason`, `givenBy` (Ref User) |
| **Setting** | `Setting.js` | Global system variables | `companyName`, `contactEmail`, `businessHours`, `holidayPolicy`, `enableBackups`, `salaryRuleMin` |
| **Shift** | `Shift.js` | Schedule calendar shifts | `employee` (Ref Employee), `date`, `startTime`, `endTime`, `type` (Day, Night, Weekend), `scheduledBy` (Ref User) |
| **Announcement** | `Announcement.js` | Global bulletin board notices | `title`, `content`, `priority` (low, medium, high), `createdBy` (Ref User), `isActive` (boolean), `expiryDate` |
| **Candidate** | `Candidate.js` | Recruitment applicants tracker | `name`, `email`, `phone`, `designation`, `status` (Applied, Interview Scheduled, Hired, Rejected), `interviewDate`, `notes`, `appliedDate` |
| **Expense** | `Expense.js` | Claims and reimbursement logs | `employee` (Ref Employee), `title`, `amount`, `category` (Travel, Office Supplies, Meals, etc.), `description`, `date`, `status` (Pending, Approved, Rejected), `approvedBy` (Ref User), `approvedDate` |

---

## 3. Middleware Architecture
The server handles authentication, requests validation, and errors gracefully via specialized middleware in `backend/middleware/`:

### 1. Authentication Check (`authMiddleware.js`)
* **`protect`**: Verifies the JWT token passed in the request header (`Authorization: Bearer <token>`). Decodes the token to fetch the User profile from the DB and attaches it to `req.user`. If missing or invalid, throws a 401 Unauthorized response.
* **`authorize(...roles)`**: Custom role guard. Restricts access to matching endpoint operations. If the user's role is not included in the specified parameters, throws a 403 Forbidden response.

### 2. Error Handler (`errorMiddleware.js`)
* Catches all unhandled syntax or database operation errors (e.g., Mongoose validation errors, CastErrors, duplicate key codes) and returns standard JSON responses: `{ success: false, message: error.message }`.

---

## 4. API Endpoints Directory
All routes are prefixed with `/api` and mapped as follows:

### 1. Authentication (`/api/auth`)
* `POST /login`: Log in credentials (email/password). Returns JWT token and User object.
* `POST /register`: Public registration (automatically creates an Employee and User profile).
* `GET /me`: Returns details of current logged-in user (populated with Employee details).

### 2. Employees (`/api/employees`)
* `GET /`: Retrieve all employee rosters (Admin, HR, Manager).
* `GET /directory`: Fetch public active colleagues directory.
* `GET /me`: Retrieve personal logs (assets, reviews, leaves, expenses).
* `PUT /me`: Self-profile details updates (phone, DOB, skills, address).
* `POST /`: Add employee profile and credentials (Admin, HR).
* `GET /:id`: Retrieve detailed employee profile card (Admin, HR, Manager).
* `PUT /:id`: Update employee details (Admin, HR).
* `DELETE /:id`: Delete employee profile and credentials (Admin).

### 3. Leaves (`/api/leaves`)
* `GET /`: Retrieve leave records (Admin, HR, Manager).
* `POST /apply`: Submit a leave request (Employee, HR, Admin).
* `GET /my-leaves`: Retrieve personal leave history (All).
* `GET /balances`: Retrieve personal leave balance summaries.
* `PUT /:id/status`: Approve/Reject leave requests with comments (Admin, HR, Manager).

### 4. Attendance (`/api/attendance`)
* `POST /clockin`: Log start time and compute late status (09:30 AM limit).
* `POST /clockout`: Log end time, compute duration, and record overtime.
* `GET /today-status`: Fetch clock status details for current date.
* `GET /my-logs`: Fetch personal timesheet history.
* `GET /logs`: Fetch all timesheet logs (Admin, HR, Manager).
* `POST /regularize`: Submit correction request.
* `GET /regularize/my`: Fetch personal correction requests.
* `GET /regularize/all`: Fetch all pending regularization logs (Admin, HR, Manager).
* `PUT /regularize/:id`: Approve/Reject regularization logs (Admin, HR, Manager).

### 5. Payroll (`/api/payroll`)
* `GET /`: Fetch payroll history (All).
* `GET /my`: Fetch personal payroll payslips.
* `GET /:id`: Fetch detailed payslip (All).
* `POST /generate`: Process monthly payroll payouts (Admin).
* `PUT /:id`: Modify payslip rates/amounts (Admin).

### 6. Departments & Designations
* **Departments (`/api/departments`)**:
  - `GET /`: Fetch list of all departments.
  - `POST /`: Create a new department (Admin).
  - `PUT /:id`: Update department details/manager (Admin).
  - `DELETE /:id`: Remove a department (Admin).
* **Designations (`/api/designations`)**:
  - `GET /`: Fetch list of all job designations.
  - `POST /`: Create a new designation (Admin).
  - `PUT /:id`: Update designation details (Admin).
  - `DELETE /:id`: Remove a designation (Admin).

### 7. Operational Tasks & Actions
* **Tasks (`/api/tasks`)**:
  - `GET /`: Get task list (Employees see own; Admin, HR, Manager see all).
  - `POST /`: Assign task to employee (Admin, HR, Manager).
  - `PUT /:id`: Update task details/status (Employees update status/progress; Admin, HR, Manager update all).
  - `DELETE /:id`: Remove task (Admin, HR, Manager).
* **Performance (`/api/performance`)**:
  - `GET /`: Get evaluations (Employees see own; Admin, HR, Manager see all).
  - `POST /`: Create rating evaluation (Admin, HR, Manager).
* **Asset Manager (`/api/assets`)**:
  - `GET /`: Fetch list of assets (Admin, HR, Manager see all; Employees see own).
  - `POST /`: Create/Add asset (Admin, HR).
  - `PUT /:id`: Update asset status (Admin, HR).
  - `DELETE /:id`: Delete asset record (Admin).
  - `POST /request`: Submit equipment allocation requests.
  - `GET /requests`: Fetch equipment requests.
  - `PUT /requests/:id`: Approve/Reject requests (Admin, HR, Manager).
* **Expenses (`/api/expenses`)**:
  - `GET /`: Retrieve expense claims.
  - `POST /`: Submit new expense claim.
  - `PUT /:id`: Approve/Reject expense reimbursement claims (Admin, HR, Manager).
* **Recruitment (`/api/recruitment`)**:
  - `GET /`: Fetch job candidates pipeline (Admin, HR).
  - `POST /`: Create candidate applicant (Admin, HR).
  - `PUT /:id`: Update applicant stage/interview dates (Admin, HR).
  - `DELETE /:id`: Remove applicant records (Admin, HR).
* **Engagement & Wellbeing (`/api/engagement`)**:
  - Moods, polls, and rewards endpoints.
  - Handles wellbeing charts calculations, poll voting, and point distribution controls.
* **Announcements (`/api/announcements`)**:
  - Handles announcements publishing, active logs, and priority sorting.
* **Admin Controls (`/api/admin`)**:
  - `GET /overview`: Return system overview stats (Admin).
  - `GET /users`: Return registered user accounts list (Admin).
  - `PUT /users/:id/role`: Change user system roles (Admin).
  - `GET /audit-logs`: Fetch trail logs (Admin).
  - `GET /settings` / `PUT /settings`: System settings adjustments (Admin).
  - `GET /backup` / `POST /restore`: Export/Import database snapshots (Admin).

---

## 5. Database Seeding & Startup Scripts
- **`server.js`**: Initializes the database connection, registers middleware, registers routes, and triggers `seedDatabase()`.
  - Creates baseline departments (HR, Engineering, Marketing, Sales).
  - Seeds core accounts if DB is empty:
    - Admin: `admin@ems.com` / `admin123`
    - HR: `hr@ems.com` / `hr123`
    - Manager: `manager@ems.com` / `manager123` (Sophia Patel, Marketing)
    - Employee: `employee@ems.com` / `employee123`
- **`seedFix.js`**: Utility script to verify and repair seeded accounts to ensure credentials align perfectly.
