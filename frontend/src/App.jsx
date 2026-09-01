import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
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


// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <h2>EMS HUB Loading session...</h2>
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
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <h2>Loading EMS Workspace...</h2>
      </div>
    );
  }

  const isLoginPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="app-container">
      {/* Show Sidebar and Navbar only if authenticated and not on login page */}
      {user && !isLoginPage && (
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      )}

      <div className="main-content">
        {user && !isLoginPage && (
          <Navbar collapsed={collapsed} setCollapsed={setCollapsed} />
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
              <ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}>
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
          <Route path="/self-service" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><SelfService /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Tasks /></ProtectedRoute>} />
          <Route path="/directory" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Directory /></ProtectedRoute>} />
          <Route path="/rewards" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Rewards /></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Assets /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Expenses /></ProtectedRoute>} />
          <Route path="/shifts" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Shifts /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Documents /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Chat /></ProtectedRoute>} />
          <Route path="/resignations" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Resignations /></ProtectedRoute>} />


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
