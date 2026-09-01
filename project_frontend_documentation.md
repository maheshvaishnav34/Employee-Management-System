# Frontend Documentation: EMS Hub Client Application

This document provides a comprehensive technical guide to the frontend architecture, state management, routing system, page views, widgets, and styles of the Employee Management System (EMS Hub) client application.

---

## 1. System Overview & Tech Stack
The frontend is a Single Page Application (SPA) built using React.js and compiled with Vite. It features a responsive layout, modern dark theme accents, micro-animations, real-time widgets, and full role-based access control (RBAC).

- **Build Engine**: Vite
- **Framework**: React.js
- **Styling**: Vanilla CSS (`index.css` for design system tokens, `App.css` for pages-specific layout adjustments)
- **Icons**: Lucide React
- **HTTP Client**: Axios (configured in `utils/api.js` with automated JWT Bearer headers injection from local storage)

---

## 2. Protected Routing & Auth Guard
Routing is managed inside [App.jsx](file:///d:/New%20folder/Employee%20Management%20System/frontend/src/App.jsx). 

### Route Security Model
- **`ProtectedRoute`**: Custom security wrapper component checks the current user session state via `useAuth()`.
  - Redirects to `/login` if no user session exists.
  - Checks role authorization parameters: if the user's role is not included in the allowed list (e.g. `allowedRoles={['admin', 'hr']}`), automatically redirects back to the `/dashboard` safely.
- **Client Port**: Runs on port `5173` locally.

---

## 3. Sidebar Navigation & Layout Configuration
The layout utilizes a collapsible sidebar component [Sidebar.jsx](file:///d:/New%20folder/Employee%20Management%20System/frontend/src/components/Sidebar.jsx). 
- Menus are dynamically filtered on-render based on the user's role:
  `filteredMenu = menuItems.filter(item => item.roles.includes(user.role))`
- Provides clean indicators for active routes with highlight accents.

---

## 4. Context & Global State Management
Global authentication session state is managed via the **AuthProvider** in `frontend/src/context/AuthContext.jsx`:
- **`user` State**: Holds the parsed user profile object, role permissions, and linked employee credentials.
- **`login(email, password)`**: Handles API credential matching, sets local storage key `ems_token`, and initializes the authenticated state.
- **`logout()`**: Empties state, removes credentials keys, and triggers immediate redirect.
- **`setUser`**: Allows direct context state patches (useful for profile details edits).

---

## 5. Client Page Components Directory (`frontend/src/pages/`)
The application contains **27 separate interface modules** categorized by functional areas:

### 1. General Views
* **Dashboard.jsx**: Configures three distinct UI dashboard layouts based on role:
  * *Admin/HR*: Displays overall company cards (headcount, present, late, pending leaves), audit logs feed, quick approvals, well-being mood pulses, and payroll summary gauges.
  * *Manager*: Displays team management widgets, team counts, pending leaves checklists, team member birthdays, and active clock logs.
  * *Employee*: Displays self-clock status, attendance widgets, announcements, local celebrations, pending tasks, and recent payslip summaries.
* **Login.jsx / Signup.jsx**: Form submission screens. Includes "quick-fill" demo account badges on the login screen to facilitate testing.
* **Profile.jsx**: Displays the personnel profile card. The fields are split into tabs (Personal Details, Address, Emergency Contacts, Assets Assigned, Reviews Log, Expense Logs). Core identifiers (firstName, lastName) are locked read-only.

### 2. Operational Pages
* **Employees.jsx**: Registry table for employee profiles. Admin and HR can access the add, edit, and delete drawer forms. Other roles have read-only views.
* **Directory.jsx**: Visual grids of active employees showing avatars, designations, email links, phone numbers, and technical skills badges.
* **Attendance.jsx**: Logs manager. Employees can clock-in/out and submit attendance regularizations. Admins, HRs, and Managers can filter all logs and process regularization approvals.
* **Leaves.jsx**: Leave booking system. Handles balance calculation, leave request submissions, and status approvals.
* **Payroll.jsx**: Displays payslips table logs. Admin, HR, and Managers can view the global payroll ledger in read-only mode, while Admin retains exclusive rights to generate payroll cycles and edit base salary adjustments. Employee role only displays self salary slips.
* **Tasks.jsx**: Board for task assignments. Handles status changes (Pending, In Progress, Completed) and priority labels.
* **Recruitment.jsx**: Candidate applicant pipeline. Tracks candidates' progress status (Applied, Interviewing, Offered, Rejected, Hired).
* **Performance.jsx**: Performance dashboard. Managers, HRs, and Admins can rate employees using 1-5 star scales and feedback remarks.
* **Shifts.jsx**: Work calendar shift schedules constructor. Allows scheduling Day, Night, and Weekend slots.
* **Rewards.jsx**: Recognition portal. Recognizes achievements with awards points.
* **Expenses.jsx**: Claims tracker. Submits and approves/rejects expense claims.
* **Assets.jsx**: Asset allocations manager. Assigns company laptops, tablets, and devices.
* **Documents.jsx**: Policy library drawer. Allows publishing document policies.
* **Chat.jsx**: Real-time corporate chat board. Features channels and instant communications.
* **SelfService.jsx**: Portal containing helpful self-service options.
* **AdminPanel.jsx**: Main system console (Admin only). Tabs include counts metrics overview, user role modifications, system settings configs, audit logs search, and DB backup JSON exports/restores.

### 3. Custom Report Pages (`/reports/*`)
* **ReportsPage.jsx**: Reports panel launcher.
* **InSummaryReports.jsx**: Summary statistics reports.
* **EmployeeDirectoryReport.jsx**: Personnel audit report.
* **AttendanceAuditReport.jsx**: Timesheet audits.
* **PayrollLedgerReport.jsx**: Ledger audit sheets.
* **LeaveAllocationReport.jsx**: Time-off allocation audits.

---

## 6. Client Reusable UI Components (`frontend/src/components/`)
The application contains **24 specialized UI widgets and sub-components** supporting pages:

1. **ActivityFeed.jsx**: Displays recent audit logs or system events feed.
2. **AdminEngagementAnalytics.jsx**: Renders visual metrics of polls, moods, and points.
3. **AnnouncementsWidget.jsx**: Carousel or list of active company notices.
4. **AttendanceWidget.jsx**: Quick clock-in/out control panel with duration.
5. **CelebrationsWidget.jsx**: Renders birthdays and work anniversaries list.
6. **Charts.jsx**: Wraps Recharts components for data visualizations.
7. **DashboardPollWidget.jsx**: Render and submit active vote options.
8. **DeptPerformance.jsx**: Visual charts for departmental review averages.
9. **EmployeeInfoHubWidget.jsx**: Quick directories details card.
10. **GenderChart.jsx**: Circular chart of gender distributions.
11. **HeadcountTrend.jsx**: Line chart showing company growth.
12. **LeaveQuickApprove.jsx**: Fast-access list of pending leaves for managers/HRs.
13. **LiveClock.jsx**: Display of active system time.
14. **MoodPulseWidget.jsx**: Wellbeing mood tracking options checklist.
15. **Navbar.jsx**: Top bar containing title, profile menu, and toggle controls.
16. **NotificationsPanel.jsx**: Popover tray listing active alerts and reviews.
17. **PayrollSummaryWidget.jsx**: Displays payroll status metrics.
18. **PayslipModal.jsx**: Modal dialog rendering complete details of a payslip.
19. **PendingReviewsWidget.jsx**: Checklist of employees pending performance reviews.
20. **QuickActions.jsx**: Floating menu buttons for common user pathways.
21. **Sidebar.jsx**: Navigation collapsible sidebar panel.
22. **Skeleton.jsx**: Loading placeholder shapes for dashboards.
23. **StatCard.jsx**: Metric summary card with icon, percentage, and trends.
24. **TopPerformers.jsx**: Highlighting employees with maximum ratings or points.

---

## 7. Styling Guide & CSS Custom Variables
The interface styling is located in `frontend/src/index.css` and `App.css`. It establishes a modern dark/light system utilizing CSS custom properties:

```css
:root {
  /* Core Brand Colors */
  --primary-accent: #6777ef;
  --secondary-accent: #a78bfa;
  
  /* System State Alerts */
  --success: #2ebd7f;
  --warning: #ffb119;
  --danger: #ff5b5b;
  --info: #3ab7e8;

  /* UI Surface Variables */
  --bg-primary: #12141d;
  --bg-secondary: #1b1e2e;
  --border-color: #2a2f45;
  --text-primary: #ffffff;
  --text-secondary: #9aa0ac;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}
```

- **Animations**: Uses slide-in fade-ups (`slideUpFade`), glow pulses (`glowPulse`), and spin effects for a fluid, premium experience.
- **Responsiveness**: Flexbox and CSS Grid designs ensure layout adjusts from 320px screens up to 4K resolutions.
