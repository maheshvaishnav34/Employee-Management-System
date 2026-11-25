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
import SessionBreakdownTable from '../components/SessionBreakdownTable';
import { formatClockTime, formatMinutesDuration, getDailyStatusTheme, formatDailyStatusLabel } from '../utils/attendanceFormat';
import {
  Users, UserCheck, UserX, UserPlus,
  CalendarCheck, CalendarX, Clock, ClipboardList,
  FileSpreadsheet, FileText, AlertCircle,
  CircleDollarSign, RefreshCw, Shield, Sparkles,
  ChevronDown, ChevronRight, Activity, Timer
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
  const [teamSummary, setTeamSummary] = useState(null);
  const [expandedDashRow, setExpandedDashRow] = useState(null);

  const fadeInUpStyle = (delayMs) => ({
    animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
    animationDelay: `${delayMs}ms`,
  });

  const fetchDashboardData = async (isManual = false) => {
    try {
      if (isManual || !data) setLoading(true);
      setError('');
      const statsUrl = isManual ? '/dashboard/stats?nocache=1' : '/dashboard/stats';
      const [res, summaryRes] = await Promise.all([
        api.get(statsUrl),
        user?.role === 'manager'
          ? api.get('/attendance/summary').catch(() => null)
          : Promise.resolve(null),
      ]);
      if (summaryRes?.success) {
        setTeamSummary(summaryRes);
      }
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
            <StatCard title="Present Today"      value={c.todayPresent ?? 0}      icon={CalendarCheck} color="success" subText={`${c.attendanceRate ?? 0}% · ${c.currentlyWorking ?? 0} working now`} />
            <StatCard title="Absent Today"       value={c.todayAbsent ?? 0}       icon={CalendarX}     color="danger"  subText="Not clocked in" />
            <StatCard title="Late Arrivals"      value={c.todayLate ?? 0}         icon={Clock}         color="warning" subText={`${c.incompleteAttendance ?? 0} incomplete punch(es)`} />
            <StatCard title="Pending Leaves"     value={c.pendingLeaves ?? 0}     icon={ClipboardList} color="warning" subText={`${c.approvedLeaves ?? 0} approved · ${c.rejectedLeaves ?? 0} rejected`} />
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
                          {log.clockOut ? ` · Out: ${new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' · Working'}
                          {` · ${log.sessionCount || 1} punch${(log.sessionCount || 1) > 1 ? 'es' : ''}`}
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

          {/* Row 1 & Row 2: Manager Team Attendance Summary Cards (8 required metrics) */}
          {(() => {
            const mCards = teamSummary?.cards || {};
            const totalTeamMembers = mCards.totalTeamMembers ?? c.activeEmployees ?? c.totalEmployees ?? 0;
            const presentToday = mCards.presentToday ?? c.todayPresent ?? 0;
            const currentlyWorking = mCards.currentlyWorking ?? c.currentlyWorking ?? 0;
            const notClockedIn = mCards.notClockedIn ?? c.todayAbsent ?? 0;
            const clockedOut = mCards.clockedOut ?? c.clockedOutToday ?? 0;
            const lateArrivals = mCards.lateArrivals ?? c.todayLate ?? 0;
            const incompleteAttendance = mCards.incompleteAttendance ?? c.incompleteAttendance ?? 0;
            const totalTeamHours = mCards.totalWorkingHours ?? c.totalTeamHoursToday ?? 0;

            return (
              <>
                <div className="grid-auto-fit-4" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(75) }}>
                  <StatCard title="Total Team Members" value={totalTeamMembers} icon={Users} color="primary" subText="Assigned team headcount" />
                  <StatCard title="Present Today" value={presentToday} icon={CalendarCheck} color="success" subText={`${c.attendanceRate ?? 0}% team attendance`} />
                  <StatCard title="Currently Working" value={currentlyWorking} icon={Activity} color="success" subText="Clocked in now" />
                  <StatCard title="Not Clocked In" value={notClockedIn} icon={CalendarX} color="danger" subText="Awaiting first punch" />
                </div>

                <div className="grid-auto-fit-4" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(150) }}>
                  <StatCard title="Clocked Out" value={clockedOut} icon={UserCheck} color="info" subText="Clocked out today" />
                  <StatCard title="Late Arrivals" value={lateArrivals} icon={Clock} color="warning" subText="First punch past grace window" />
                  <StatCard title="Incomplete Attendance" value={incompleteAttendance} icon={AlertCircle} color="danger" subText="Missing clock-out / under hours" />
                  <StatCard title="Total Team Working Hours" value={formatMinutesDuration(totalTeamHours * 60)} icon={Timer} color="primary" subText={`${c.pendingLeaves ?? 0} pending leave(s)`} />
                </div>
              </>
            );
          })()}

          {/* Row 2b: Team Tasks Summary */}
          <div className="dashboard-grid-2" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(180) }}>
            <StatCard title="Pending Tasks"   value={c.pendingTasks ?? 0}   icon={ClipboardList} color="info"    subText="Tasks in progress or pending" />
            <StatCard title="Completed Tasks" value={c.completedTasks ?? 0} icon={UserCheck}     color="success" subText="Successfully completed tasks" />
          </div>

          {/* Row 3: Leave Quick Approve & Top Performers */}
          <div className="dashboard-grid-split" style={{ marginBottom: '1.25rem', ...fadeInUpStyle(225) }}>
            <LeaveQuickApprove
              leaves={data?.lists?.recentLeaves ?? []}
              onUpdate={() => fetchDashboardData(true)}
            />
            <TopPerformers performers={data?.lists?.topPerformers ?? []} />
          </div>

          {/* Row 4: Team Attendance Table */}
          <div className="card" style={{ ...fadeInUpStyle(300) }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Clock size={18} style={{ color: 'var(--info)' }} />
                Today's Team Attendance Breakdown
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Click a row to view punch history
              </span>
            </div>
            {!teamSummary?.rows?.length ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem', fontSize: '0.85rem' }}>
                No team members found in your department.
              </p>
            ) : (
              <div className="data-table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}></th>
                      <th>Employee Name</th>
                      <th>Employee ID</th>
                      <th>Department</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Punches</th>
                      <th>Total Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamSummary.rows.map((row) => {
                      const empKey = row.employee?._id;
                      const isExpanded = expandedDashRow === empKey;
                      const theme = getDailyStatusTheme(row.dailyStatus);

                      return (
                        <React.Fragment key={empKey}>
                          <tr
                            onClick={() => row.sessions?.length && setExpandedDashRow(isExpanded ? null : empKey)}
                            style={{ cursor: row.sessions?.length ? 'pointer' : 'default' }}
                          >
                            <td>
                              {row.sessions?.length > 0 && (
                                isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                              )}
                            </td>
                            <td>
                              <strong>{row.employee?.firstName} {row.employee?.lastName}</strong>
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{row.employee?.employeeId}</td>
                            <td style={{ fontSize: '0.82rem' }}>{row.employee?.department?.name || '–'}</td>
                            <td>{formatClockTime(row.clockIn)}</td>
                            <td>
                              {row.clockOut
                                ? formatClockTime(row.clockOut)
                                : row.dailyStatus === 'Currently Working'
                                  ? <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.76rem' }}>Working</span>
                                  : '–'}
                            </td>
                            <td style={{ fontWeight: 700 }}>{row.sessionsCount}</td>
                            <td style={{ fontWeight: 700 }}>{formatMinutesDuration(row.totalMinutes)}</td>
                            <td>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '0.18rem 0.55rem',
                                  borderRadius: 14,
                                  background: theme.bg,
                                  color: theme.color,
                                  border: `1px solid ${theme.border}`,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {formatDailyStatusLabel(row.dailyStatus)}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={9} style={{ padding: '0.35rem 0.75rem', background: 'var(--bg-primary)' }}>
                                <SessionBreakdownTable sessions={row.sessions} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
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
                  Have an amazing work day today. Make sure to complete your standard punches and log hours.
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
              <AttendanceWidget onActionComplete={() => fetchDashboardData(true)} />
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
                          Net: <strong style={{ color: 'var(--success)' }}>₹{data.recentPayslip.netSalary?.toLocaleString()}</strong>
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
