import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { SkeletonDashboard } from './components/Skeleton';

const ServiceUnavailable = lazy(() => import('./pages/ServiceUnavailable'));

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Employees = lazy(() => import('./pages/Employees'));
const Departments = lazy(() => import('./pages/Departments'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Leaves = lazy(() => import('./pages/Leaves'));
const Payroll = lazy(() => import('./pages/Payroll'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Recruitment = lazy(() => import('./pages/Recruitment'));
const Performance = lazy(() => import('./pages/Performance'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const InSummaryReports = lazy(() => import('./pages/InSummaryReports'));
const EmployeeDirectoryReport = lazy(() => import('./pages/EmployeeDirectoryReport'));
const AttendanceAuditReport = lazy(() => import('./pages/AttendanceAuditReport'));
const PayrollLedgerReport = lazy(() => import('./pages/PayrollLedgerReport'));
const LeaveAllocationReport = lazy(() => import('./pages/LeaveAllocationReport'));
const ProductivityReport = lazy(() => import('./pages/ProductivityReport'));
const Profile = lazy(() => import('./pages/Profile'));
const SelfService = lazy(() => import('./pages/SelfService'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Directory = lazy(() => import('./pages/Directory'));
const Rewards = lazy(() => import('./pages/Rewards'));
const Assets = lazy(() => import('./pages/Assets'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Shifts = lazy(() => import('./pages/Shifts'));
const Documents = lazy(() => import('./pages/Documents'));
const Chat = lazy(() => import('./pages/Chat'));
const Resignations = lazy(() => import('./pages/Resignations'));
const Complaints = lazy(() => import('./pages/Complaints'));
const Training = lazy(() => import('./pages/Training'));
const SystemPoliciesSettings = lazy(() => import('./pages/SystemPoliciesSettings'));


// Error Boundary for unexpected runtime UI crashes
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || '' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Suspense fallback={<div style={{ padding: '2rem' }}><SkeletonDashboard /></div>}>
          <ServiceUnavailable
            info={{
              reason: 'runtime_error',
              message: 'The application encountered an unexpected error while rendering this page.',
            }}
            onRecovered={() => {
              this.setState({ hasError: false, errorMessage: '' });
              window.location.reload();
            }}
          />
        </Suspense>
      );
    }
    return this.props.children;
  }
}

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
  const [unavailableInfo, setUnavailableInfo] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Listen for global server/network 503 unavailability events
  useEffect(() => {
    const handleUnavailable = (event) => {
      setUnavailableInfo((prev) => prev || event.detail || { status: 503 });
    };
    window.addEventListener('ems:service-unavailable', handleUnavailable);
    return () => window.removeEventListener('ems:service-unavailable', handleUnavailable);
  }, []);

  // Auto-close mobile sidebar when navigating to a new route
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (unavailableInfo) {
    return (
      <Suspense fallback={<div style={{ padding: '2rem' }}><SkeletonDashboard /></div>}>
        <ServiceUnavailable
          info={unavailableInfo}
          onRecovered={() => setUnavailableInfo(null)}
        />
      </Suspense>
    );
  }

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

        <Suspense fallback={<div style={{ padding: '2rem' }}><SkeletonDashboard /></div>}>
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
          <Route path="/shifts" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}><Shifts /></ProtectedRoute>} />
          <Route path="/rewards" element={<ProtectedRoute allowedRoles={['admin']}><Rewards /></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute allowedRoles={['admin']}><Assets /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin']}><Expenses /></ProtectedRoute>} />
          <Route path="/system-policies" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><SystemPoliciesSettings /></ProtectedRoute>} />


          {/* Service Unavailable Preview Route */}
          <Route
            path="/503"
            element={
              <ServiceUnavailable
                onRecovered={() => navigate(user ? '/dashboard' : '/login', { replace: true })}
              />
            }
          />

          {/* Fallback routes */}
          <Route
            path="*"
            element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default function RootApp() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}
