import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import StatCard from '../components/StatCard';
import AttendanceWidget from '../components/AttendanceWidget';
import { PayrollChart, DepartmentChart } from '../components/Charts';
import PayslipModal from '../components/PayslipModal';
import ActivityFeed from '../components/ActivityFeed';
import TopPerformers from '../components/TopPerformers';
import PayrollSummaryWidget from '../components/PayrollSummaryWidget';
import QuickActions from '../components/QuickActions';
import GenderChart from '../components/GenderChart';
import DeptPerformance from '../components/DeptPerformance';
import LeaveQuickApprove from '../components/LeaveQuickApprove';
import HeadcountTrend from '../components/HeadcountTrend';
import PendingReviewsWidget from '../components/PendingReviewsWidget';
import EmployeeInfoHubWidget from '../components/EmployeeInfoHubWidget';
import MoodPulseWidget from '../components/MoodPulseWidget';
import DashboardPollWidget from '../components/DashboardPollWidget';
import AdminEngagementAnalytics from '../components/AdminEngagementAnalytics';
import AnnouncementsWidget from '../components/AnnouncementsWidget';
import CelebrationsWidget from '../components/CelebrationsWidget';
import {
  Users, UserCheck, UserX, UserPlus,
  CalendarCheck, CalendarX, Clock, ClipboardList,
  FileSpreadsheet, FileText, AlertCircle,
  CircleDollarSign, RefreshCw, Shield, Sparkles
} from 'lucide-react';

// Global memory cache for instant dashboard transitions
let cachedDashboardStats = null;

const Dashboard = () => {
  const { user } = useAuth();
  
  // Instant initial state from memory cache, session storage, or local storage
  const [data, setData] = useState(() => {
    if (cachedDashboardStats) return cachedDashboardStats;
    try {
      const stored = sessionStorage.getItem(`ems_dash_${user?.role}`) || localStorage.getItem('ems_dash_cache');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  
  // Only show loading spinner if completely no data exists
  const [loading, setLoading] = useState(() => {
    if (cachedDashboardStats) return false;
    try {
      const stored = sessionStorage.getItem(`ems_dash_${user?.role}`) || localStorage.getItem('ems_dash_cache');
      return !stored;
    } catch (e) {
      return true;
    }
  });

  const [error, setError] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fadeInUpStyle = (delayMs) => ({
    animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
    animationDelay: `${delayMs}ms`,
  });

  const fetchDashboardData = async (isManual = false) => {
    try {
      if (isManual || !data) setLoading(true);
      setError('');
      const res = await api.get('/dashboard/stats');
      if (res.success) {
        setData(res.stats);
        cachedDashboardStats = res.stats;
        try {
          sessionStorage.setItem(`ems_dash_${user?.role}`, JSON.stringify(res.stats));
          localStorage.setItem('ems_dash_cache', JSON.stringify(res.stats));
        } catch (e) {}
        setLastRefresh(new Date());
      }
    } catch (err) {
      if (!data) {
        setError(err.message || 'Failed to fetch dashboard metrics');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (loading && !data) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="pulse-loader" />
          <h2 style={{ fontWeight: 700 }}>Loading Dashboard...</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Gathering workplace statistics</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={20} /> {error}
        </div>
        <button onClick={fetchDashboardData} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';
  const isManager = user?.role === 'manager';
  const c = data?.cards || {};

  return (
    <div className="page-container">
      {isAdminOrHR ? (
        /* ═══════════════ ADMIN / HR DASHBOARD ═══════════════ */
        <>
          {/* Admin Welcome Banner & Refresh */}
          <div className="card dashboard-welcome-banner" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            padding: '1.25rem 1.5rem',
            borderRadius: '14px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)',
            ...fadeInUpStyle(25)
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '12px',
                background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-accent)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Shield size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Workplace Analytics Center</h1>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Monitor system headcounts, daily attendance records, logs, leave approvals, and payroll distributions.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => fetchDashboardData(true)}
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1.15rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                title={`Last refreshed: ${lastRefresh.toLocaleTimeString()}`}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div style={{ marginBottom: '1.25rem', ...fadeInUpStyle(50) }}>
            <QuickActions />
          </div>

          {/* Announcements & Celebrations Bulletin */}
          <div className="dashboard-grid-split" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(60) }}>
            <AnnouncementsWidget />
            <CelebrationsWidget
              birthdays={data?.lists?.upcomingBirthdays ?? []}
              anniversaries={data?.lists?.workAnniversaries ?? []}
            />
          </div>

          {/* Row 1: Employee Count Cards */}
          <div className="grid-auto-fit-4" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(75) }}>
            <StatCard title="Total Employees"   value={c.totalEmployees ?? 0}    icon={Users}     color="primary" subText={`${c.totalDepartments ?? 0} departments`} />
            <StatCard title="Active Staff"       value={c.activeEmployees ?? 0}   icon={UserCheck} color="success" subText={`${c.newThisMonth ?? 0} joined this month`} />
            <StatCard title="Inactive"           value={c.inactiveEmployees ?? 0} icon={UserX}     color="danger"  subText="Deactivated accounts" />
            <StatCard title="New This Month"     value={c.newThisMonth ?? 0}      icon={UserPlus}  color="info"    subText="Recent joinings" />
          </div>

          {/* Row 2: Attendance Summary Cards */}
          <div className="grid-auto-fit-4" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(150) }}>
            <StatCard title="Present Today"  value={c.todayPresent ?? 0}   icon={CalendarCheck} color="success" subText={`${c.attendanceRate ?? 0}% attendance rate`} />
            <StatCard title="Absent Today"   value={c.todayAbsent ?? 0}    icon={CalendarX}     color="danger"  subText="Not clocked in" />
            <StatCard title="Late Arrivals"  value={c.todayLate ?? 0}      icon={Clock}         color="warning" subText="Clocked in late today" />
            <StatCard title="Pending Leaves" value={c.pendingLeaves ?? 0}  icon={ClipboardList} color="warning" subText={`${c.approvedLeaves ?? 0} approved · ${c.rejectedLeaves ?? 0} rejected`} />
          </div>

          {/* Row 3: Headcount Trend + Gender + Dept Performance */}
          <div className="dashboard-grid-3" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(225) }}>
            <HeadcountTrend data={data?.charts?.headcountTrend} />
            <GenderChart data={data?.charts?.genderDistribution ?? []} />
            <DeptPerformance data={data?.charts?.departmentDistribution ?? []} />
          </div>

          {/* Row 4: Payroll Chart + Dept Share */}
          <div className="dashboard-grid-split" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(300) }}>
            <PayrollChart data={data?.charts?.monthlyPayrollTrend} />
            <DepartmentChart data={data?.charts?.departmentDistribution} />
          </div>

          {/* Row 5: Activity Feed */}
          <div style={{ marginBottom: '1.25rem', ...fadeInUpStyle(375) }}>
            <ActivityFeed
              logs={data?.lists?.recentAuditLogs ?? []}
              newEmployees={data?.lists?.newEmployees ?? []}
            />
          </div>

          {/* Row 6: Quick Approvals Hub (Leaves, Expenses, Assets) */}
          <div className="dashboard-grid-2" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(450) }}>
            <LeaveQuickApprove
              leaves={data?.lists?.recentLeaves ?? []}
              onUpdate={fetchDashboardData}
            />
            <PendingReviewsWidget />
          </div>

          {/* Row 6b: Workplace Engagement Hub */}
          <div style={{ marginBottom: '1.25rem', ...fadeInUpStyle(485) }}>
            <AdminEngagementAnalytics />
          </div>

          {/* Row 7: Top Performers + Payroll Summary */}
          <div className="dashboard-grid-split" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(500) }}>
            <TopPerformers performers={data?.lists?.topPerformers ?? []} />
            <PayrollSummaryWidget payroll={data?.payroll} />
          </div>

          {/* Row 8: Today's Clock Logs (full-width grid) */}
          <div className="card" style={{ ...fadeInUpStyle(550) }}>
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Clock size={18} style={{ color: 'var(--info)' }} />
              Today's Clock Logs
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                Live attendance
              </span>
            </span>
            {(data?.lists?.recentAttendance ?? []).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem', fontSize: '0.85rem' }}>
                No clock logs today
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.6rem' }}>
                {data.lists.recentAttendance.map((log) => (
                  <div key={log._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.6rem 0.85rem',
                    border: '1px solid var(--border-color)', borderRadius: '10px',
                    background: 'var(--bg-primary)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div className="sidebar-footer-avatar" style={{ width: '30px', height: '30px', fontSize: '0.7rem', flexShrink: 0, background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {log.employee?.firstName?.[0]}{log.employee?.lastName?.[0]}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.87rem', display: 'block' }}>{log.employee?.firstName} {log.employee?.lastName}</strong>
                        <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                          In: {new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {log.clockOut ? ` · Out: ${new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' · Still in'}
                        </span>
                      </div>
                    </div>
                    <span className={`badge badge-${log.status.toLowerCase()}`}>{log.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : isManager ? (
        /* ═══════════════ MANAGER DASHBOARD ═══════════════ */
        <>
          {/* Manager Welcome Banner & Refresh */}
          <div className="card dashboard-welcome-banner" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            padding: '1.25rem 1.5rem',
            borderRadius: '14px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)',
            ...fadeInUpStyle(25)
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '12px',
                background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-accent)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Shield size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Team Management Hub</h1>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Monitor department team members, daily attendance logs, and pending leave requests.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => fetchDashboardData(true)}
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1.15rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                title={`Last refreshed: ${lastRefresh.toLocaleTimeString()}`}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div style={{ marginBottom: '1.25rem', ...fadeInUpStyle(50) }}>
            <QuickActions />
          </div>

          {/* Announcements & Celebrations Bulletin */}
          <div className="dashboard-grid-split" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(60) }}>
            <AnnouncementsWidget />
            <CelebrationsWidget
              birthdays={data?.lists?.upcomingBirthdays ?? []}
              anniversaries={data?.lists?.workAnniversaries ?? []}
            />
          </div>

          {/* Row 1: Team Count Cards */}
          <div className="grid-auto-fit-4" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(75) }}>
            <StatCard title="Total Team Members" value={c.totalEmployees ?? 0}    icon={Users}     color="primary" subText="Direct reports in department" />
            <StatCard title="Active Members"     value={c.activeEmployees ?? 0}   icon={UserCheck} color="success" subText="Currently active" />
            <StatCard title="Inactive Members"   value={c.inactiveEmployees ?? 0} icon={UserX}     color="danger"  subText="Suspended/inactive accounts" />
            <StatCard title="Attendance Rate"   value={`${c.attendanceRate ?? 0}%`} icon={CalendarCheck} color="info" subText="Average team attendance" />
          </div>

          {/* Row 2: Attendance Summary Cards */}
          <div className="grid-auto-fit-4" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(150) }}>
            <StatCard title="Present Today"  value={c.todayPresent ?? 0}   icon={CalendarCheck} color="success" subText="Team members present today" />
            <StatCard title="Absent Today"   value={c.todayAbsent ?? 0}    icon={CalendarX}     color="danger"  subText="Not clocked in today" />
            <StatCard title="Late Arrivals"  value={c.todayLate ?? 0}      icon={Clock}         color="warning" subText="Clocked in late today" />
            <StatCard title="Pending Leaves" value={c.pendingLeaves ?? 0}  icon={ClipboardList} color="warning" subText={`${c.approvedLeaves ?? 0} approved · ${c.rejectedLeaves ?? 0} rejected`} />
          </div>

          {/* Row 2b: Team Tasks Summary */}
          <div className="dashboard-grid-2" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(180) }}>
            <StatCard title="Pending Tasks"   value={c.pendingTasks ?? 0}   icon={ClipboardList} color="info"    subText="Tasks in progress or pending" />
            <StatCard title="Completed Tasks" value={c.completedTasks ?? 0} icon={UserCheck}     color="success" subText="Successfully completed tasks" />
          </div>

          {/* Row 3: Leave Quick Approve & Top Performers */}
          <div className="dashboard-grid-split" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(225) }}>
            <LeaveQuickApprove
              leaves={data?.lists?.recentLeaves ?? []}
              onUpdate={fetchDashboardData}
            />
            <TopPerformers performers={data?.lists?.topPerformers ?? []} />
          </div>

          {/* Row 4: Today's Team Clock Logs */}
          <div className="card" style={{ ...fadeInUpStyle(300) }}>
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Clock size={18} style={{ color: 'var(--info)' }} />
              Today's Team Clock Logs
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                Live team attendance
              </span>
            </span>
            {(data?.lists?.recentAttendance ?? []).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem', fontSize: '0.85rem' }}>
                No clock logs from your team today
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.6rem' }}>
                {data.lists.recentAttendance.map((log) => (
                  <div key={log._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.6rem 0.85rem',
                    border: '1px solid var(--border-color)', borderRadius: '10px',
                    background: 'var(--bg-primary)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div className="sidebar-footer-avatar" style={{ width: '30px', height: '30px', fontSize: '0.7rem', flexShrink: 0, background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {log.employee?.firstName?.[0]}{log.employee?.lastName?.[0]}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.87rem', display: 'block' }}>{log.employee?.firstName} {log.employee?.lastName}</strong>
                        <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                          In: {new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {log.clockOut ? ` · Out: ${new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' · Still in'}
                        </span>
                      </div>
                    </div>
                    <span className={`badge badge-${log.status.toLowerCase()}`}>{log.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ═══════════════ EMPLOYEE DASHBOARD ═══════════════ */
        <>
          {/* Employee Welcome Banner */}
          <div className="card dashboard-welcome-banner" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            padding: '1.25rem 1.5rem',
            borderRadius: '14px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)',
            ...fadeInUpStyle(25)
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Sparkles size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Welcome back, {user.username}!</h1>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Have an amazing work session today. Make sure to complete your standard punches and log hours.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>SHIFT SCHEDULE</span>
                <strong>09:30 AM - 06:30 PM</strong>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.25rem' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>CURRENT SHIFT</span>
                <strong style={{ color: 'var(--success)' }}>DAY SHIFT</strong>
              </div>
            </div>
          </div>

          {/* Employee Quick Actions Panel */}
          <div style={{ marginBottom: '1.25rem', ...fadeInUpStyle(35) }}>
            <QuickActions />
          </div>

          {/* Stats Row */}
          <div className="grid-auto-fit-4" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(50) }}>
            <StatCard title="Present This Month" value={c.monthPresent ?? 0}               icon={CalendarCheck} color="success" subText={`${c.monthLate ?? 0} late arrivals`} />
            <StatCard title="Hours Worked"        value={`${c.monthTotalHours ?? 0} hrs`}  icon={Clock}         color="primary" subText="Accumulated this month" />
            <StatCard title="Pending Leaves"      value={c.leavesPending ?? 0}             icon={ClipboardList} color="warning" subText="Awaiting approval" />
            <StatCard title="Approved Leaves"     value={c.leavesApproved ?? 0}            icon={FileSpreadsheet} color="info" subText={`${c.leavesRejected ?? 0} rejected this year`} />
          </div>

          {/* Interactive Console Grid */}
          <div className="dashboard-grid-split" style={{ ...fadeInUpStyle(75) }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <AttendanceWidget onActionComplete={fetchDashboardData} />
              <EmployeeInfoHubWidget />
              <CelebrationsWidget
                birthdays={data?.lists?.upcomingBirthdays ?? []}
                anniversaries={data?.lists?.workAnniversaries ?? []}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="chart-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CircleDollarSign size={18} style={{ color: 'var(--success)' }} />
                  Latest Salary
                </span>
                {data?.recentPayslip ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '1.05rem' }}>Month: {data.recentPayslip.month}</strong>
                        <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          Net: <strong style={{ color: 'var(--success)' }}>${data.recentPayslip.netSalary?.toLocaleString()}</strong>
                        </span>
                      </div>
                      <span className={`badge badge-${data.recentPayslip.status?.toLowerCase()}`}>{data.recentPayslip.status}</span>
                    </div>
                    <button onClick={() => setSelectedPayslip(data.recentPayslip)} className="btn btn-secondary" style={{ width: '100%', cursor: 'pointer' }}>
                      <FileText size={16} /> View Payslip
                    </button>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.85rem' }}>No salary records yet</p>
                )}
              </div>
              
              <AnnouncementsWidget />
            </div>
          </div>

          {/* Employee Wellbeing & Voices Section */}
          <div className="dashboard-grid-split" style={{ marginTop: '1.25rem', ...fadeInUpStyle(120) }}>
            <MoodPulseWidget />
            <DashboardPollWidget />
          </div>
        </>
      )}

      {selectedPayslip && (
        <PayslipModal payroll={selectedPayslip} onClose={() => setSelectedPayslip(null)} />
      )}
    </div>
  );
};

export default Dashboard;
