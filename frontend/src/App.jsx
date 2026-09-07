import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Departments from './pages/Departments';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Payroll from './pages/Payroll';
import AdminPanel from './pages/AdminPanel';
import Recruitment from './pages/Recruitment';
import Performance from './pages/Performance';
import ReportsPage from './pages/ReportsPage';
import InSummaryReports from './pages/InSummaryReports';
import EmployeeDirectoryReport from './pages/EmployeeDirectoryReport';
import AttendanceAuditReport from './pages/AttendanceAuditReport';
import PayrollLedgerReport from './pages/PayrollLedgerReport';
import LeaveAllocationReport from './pages/LeaveAllocationReport';
import ProductivityReport from './pages/ProductivityReport';
import Profile from './pages/Profile';
import SelfService from './pages/SelfService';
import Tasks from './pages/Tasks';
import Directory from './pages/Directory';
import Rewards from './pages/Rewards';
import Assets from './pages/Assets';
import Expenses from './pages/Expenses';
import Shifts from './pages/Shifts';
import Documents from './pages/Documents';
import Chat from './pages/Chat';
import Resignations from './pages/Resignations';
import Complaints from './pages/Complaints';
import Training from './pages/Training';
import SystemPoliciesSettings from './pages/SystemPoliciesSettings';


// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div className="spin" style={{ width: '28px', height: '28px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Auto-close mobile sidebar when navigating to a new route
  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div className="spin" style={{ width: '28px', height: '28px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%' }} />
      </div>
    );
  }

  const isLoginPage =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password';

  return (
    <div className={`app-container ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
      {/* Show Sidebar and Navbar only if authenticated and not on login page */}
      {user && !isLoginPage && (
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
      )}

      <div className="main-content">
        {user && !isLoginPage && (
          <Navbar
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
          />
        )}

        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <Login />}
          />
          <Route
            path="/signup"
            element={user ? <Navigate to="/dashboard" replace /> : <Signup />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/dashboard" replace /> : <Signup />}
          />
          <Route
            path="/forgot-password"
            element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />}
          />
          <Route
            path="/reset-password"
            element={user ? <Navigate to="/dashboard" replace /> : <ResetPassword />}
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/departments"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Departments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}>
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaves"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}>
                <Leaves />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payroll"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'employee']}>
                <Payroll />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruitment"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr']}>
                <Recruitment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/performance"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}>
                <Performance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/standardreport/insummaryreports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
                <InSummaryReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/standardreport/employeedirectory"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
                <EmployeeDirectoryReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/standardreport/attendanceaudit"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
                <AttendanceAuditReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/standardreport/payrollledger"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
                <PayrollLedgerReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/standardreport/leaveallocation"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
                <LeaveAllocationReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/standardreport/productivity"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
                <ProductivityReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route path="/profile" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Profile /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Tasks /></ProtectedRoute>} />
          <Route path="/training" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Training /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'employee']}><Documents /></ProtectedRoute>} />
          <Route path="/complaints" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Complaints /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Chat /></ProtectedRoute>} />
          <Route path="/resignations" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'employee']}><Resignations /></ProtectedRoute>} />
          <Route path="/directory" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}><Directory /></ProtectedRoute>} />
          <Route path="/shifts" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}><Shifts /></ProtectedRoute>} />
          <Route path="/rewards" element={<ProtectedRoute allowedRoles={['admin']}><Rewards /></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute allowedRoles={['admin']}><Assets /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin']}><Expenses /></ProtectedRoute>} />
          <Route path="/system-policies" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><SystemPoliciesSettings /></ProtectedRoute>} />


          {/* Fallback routes */}
          <Route
            path="*"
            element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;
