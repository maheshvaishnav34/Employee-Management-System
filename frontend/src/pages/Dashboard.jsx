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

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fadeInUpStyle = (delayMs) => ({
    animation: 'slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
    animationDelay: `${delayMs}ms`,
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/dashboard/stats');
      if (res.success) {
        setData(res.stats);
        setLastRefresh(new Date());
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, [user]);

  if (loading) {
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
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(103,119,239,0.06) 0%, rgba(63,81,181,0.03) 100%)',
            border: '1px solid rgba(103,119,239,0.15)',
            padding: '1.75rem',
            borderRadius: '16px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            ...fadeInUpStyle(25)
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'rgba(103,119,239,0.12)', color: 'var(--primary-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Shield size={26} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Workplace Analytics Center</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Monitor system headcounts, daily attendance records, logs, leave approvals, and payroll distributions.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <button
                onClick={fetchDashboardData}
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                title={`Last refreshed: ${lastRefresh.toLocaleTimeString()}`}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', ...fadeInUpStyle(50) }}>
            <QuickActions />
          </div>

          {/* Announcements & Celebrations Bulletin */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem', marginBottom: '1.5rem', ...fadeInUpStyle(60) }}>
            <AnnouncementsWidget />
            <CelebrationsWidget
              birthdays={data?.lists?.upcomingBirthdays ?? []}
              anniversaries={data?.lists?.workAnniversaries ?? []}
            />
          </div>

          {/* Row 1: Employee Count Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem', ...fadeInUpStyle(75) }}>
            <StatCard title="Total Employees"   value={c.totalEmployees ?? 0}    icon={Users}     color="primary" subText={`${c.totalDepartments ?? 0} departments`} />
            <StatCard title="Active Staff"       value={c.activeEmployees ?? 0}   icon={UserCheck} color="success" subText={`${c.newThisMonth ?? 0} joined this month`} />
            <StatCard title="Inactive"           value={c.inactiveEmployees ?? 0} icon={UserX}     color="danger"  subText="Deactivated accounts" />
            <StatCard title="New This Month"     value={c.newThisMonth ?? 0}      icon={UserPlus}  color="info"    subText="Recent joinings" />
          </div>

          {/* Row 2: Attendance Summary Cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1.5rem', ...fadeInUpStyle(150) }}>
            <StatCard title="Present Today"  value={c.todayPresent ?? 0}   icon={CalendarCheck} color="success" subText={`${c.attendanceRate ?? 0}% attendance rate`} />
            <StatCard title="Absent Today"   value={c.todayAbsent ?? 0}    icon={CalendarX}     color="danger"  subText="Not clocked in" />
            <StatCard title="Late Arrivals"  value={c.todayLate ?? 0}      icon={Clock}         color="warning" subText="Clocked in late today" />
            <StatCard title="Pending Leaves" value={c.pendingLeaves ?? 0}  icon={ClipboardList} color="warning" subText={`${c.approvedLeaves ?? 0} approved · ${c.rejectedLeaves ?? 0} rejected`} />
          </div>

          {/* Row 3: Headcount Trend + Gender + Dept Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.3fr', gap: '1.25rem', marginBottom: '1.5rem', ...fadeInUpStyle(225) }}>
            <HeadcountTrend data={data?.charts?.headcountTrend} />
            <GenderChart data={data?.charts?.genderDistribution ?? []} />
            <DeptPerformance data={data?.charts?.departmentDistribution ?? []} />
          </div>

          {/* Row 4: Payroll Chart + Dept Share */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.25rem', marginBottom: '1.5rem', ...fadeInUpStyle(300) }}>
            <PayrollChart data={data?.charts?.monthlyPayrollTrend} />
            <DepartmentChart data={data?.charts?.departmentDistribution} />
          </div>

          {/* Row 5: Activity Feed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.5rem', ...fadeInUpStyle(375) }}>
            <ActivityFeed
              logs={data?.lists?.recentAuditLogs ?? []}
              newEmployees={data?.lists?.newEmployees ?? []}
            />
          </div>

          {/* Row 6: Quick Approvals Hub (Leaves, Expenses, Assets) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem', ...fadeInUpStyle(450) }}>
            <LeaveQuickApprove
              leaves={data?.lists?.recentLeaves ?? []}
              onUpdate={fetchDashboardData}
            />
            <PendingReviewsWidget />
          </div>

          {/* Row 6b: Workplace Engagement Hub */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.5rem', ...fadeInUpStyle(485) }}>
            <AdminEngagementAnalytics />
          </div>

          {/* Row 7: Top Performers + Payroll Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem', marginBottom: '1.5rem', ...fadeInUpStyle(500) }}>
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
                      <div className="sidebar-footer-avatar" style={{ width: '30px', height: '30px', fontSize: '0.7rem', flexShrink: 0, background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
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
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(103,119,239,0.06) 0%, rgba(63,81,181,0.03) 100%)',
            border: '1px solid rgba(103,119,239,0.15)',
            padding: '1.75rem',
            borderRadius: '16px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            ...fadeInUpStyle(25)
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'rgba(103,119,239,0.12)', color: 'var(--primary-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Shield size={26} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Team Management Hub</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Monitor department team members, daily attendance logs, and pending leave requests.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <button
                onClick={fetchDashboardData}
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                title={`Last refreshed: ${lastRefresh.toLocaleTimeString()}`}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', ...fadeInUpStyle(50) }}>
            <QuickActions />
          </div>

          {/* Announcements & Celebrations Bulletin */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem', marginBottom: '1.5rem', ...fadeInUpStyle(60) }}>
            <AnnouncementsWidget />
            <CelebrationsWidget
              birthdays={data?.lists?.upcomingBirthdays ?? []}
              anniversaries={data?.lists?.workAnniversaries ?? []}
            />
          </div>

          {/* Row 1: Team Count Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem', ...fadeInUpStyle(75) }}>
            <StatCard title="Total Team Members" value={c.totalEmployees ?? 0}    icon={Users}     color="primary" subText="Direct reports in department" />
            <StatCard title="Active Members"     value={c.activeEmployees ?? 0}   icon={UserCheck} color="success" subText="Currently active" />
            <StatCard title="Inactive Members"   value={c.inactiveEmployees ?? 0} icon={UserX}     color="danger"  subText="Suspended/inactive accounts" />
            <StatCard title="Attendance Rate"   value={`${c.attendanceRate ?? 0}%`} icon={CalendarCheck} color="info" subText="Average team attendance" />
          </div>

          {/* Row 2: Attendance Summary Cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1.5rem', ...fadeInUpStyle(150) }}>
            <StatCard title="Present Today"  value={c.todayPresent ?? 0}   icon={CalendarCheck} color="success" subText="Team members present today" />
            <StatCard title="Absent Today"   value={c.todayAbsent ?? 0}    icon={CalendarX}     color="danger"  subText="Not clocked in today" />
            <StatCard title="Late Arrivals"  value={c.todayLate ?? 0}      icon={Clock}         color="warning" subText="Clocked in late today" />
            <StatCard title="Pending Leaves" value={c.pendingLeaves ?? 0}  icon={ClipboardList} color="warning" subText={`${c.approvedLeaves ?? 0} approved · ${c.rejectedLeaves ?? 0} rejected`} />
          </div>

          {/* Row 2b: Team Tasks Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem', ...fadeInUpStyle(180) }}>
            <StatCard title="Pending Tasks"   value={c.pendingTasks ?? 0}   icon={ClipboardList} color="info"    subText="Tasks in progress or pending" />
            <StatCard title="Completed Tasks" value={c.completedTasks ?? 0} icon={UserCheck}     color="success" subText="Successfully completed tasks" />
          </div>

          {/* Row 3: Leave Quick Approve & Top Performers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.25rem', marginBottom: '1.5rem', ...fadeInUpStyle(225) }}>
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
                      <div className="sidebar-footer-avatar" style={{ width: '30px', height: '30px', fontSize: '0.7rem', flexShrink: 0, background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
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
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(46,189,127,0.06) 0%, rgba(103,119,239,0.03) 100%)',
            border: '1px solid rgba(46,189,127,0.15)',
            padding: '1.75rem',
            borderRadius: '16px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            ...fadeInUpStyle(25)
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'rgba(46,189,127,0.12)', color: 'var(--success)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sparkles size={26} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Welcome back, {user.username}!</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Have an amazing work session today. Make sure to complete your standard punches and log hours.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>SHIFT SCHEDULE</span>
                <strong>09:30 AM - 06:30 PM</strong>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>CURRENT SHIFT</span>
                <strong style={{ color: 'var(--success)' }}>DAY SHIFT</strong>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1.5rem', ...fadeInUpStyle(50) }}>
            <StatCard title="Present This Month" value={c.monthPresent ?? 0}               icon={CalendarCheck} color="success" subText={`${c.monthLate ?? 0} late arrivals`} />
            <StatCard title="Hours Worked"        value={`${c.monthTotalHours ?? 0} hrs`}  icon={Clock}         color="primary" subText="Accumulated this month" />
            <StatCard title="Pending Leaves"      value={c.leavesPending ?? 0}             icon={ClipboardList} color="warning" subText="Awaiting approval" />
            <StatCard title="Approved Leaves"     value={c.leavesApproved ?? 0}            icon={FileSpreadsheet} color="info" subText={`${c.leavesRejected ?? 0} rejected this year`} />
          </div>

          {/* Interactive Console Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', ...fadeInUpStyle(75) }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <AttendanceWidget onActionComplete={fetchDashboardData} />
              <EmployeeInfoHubWidget />
              <CelebrationsWidget
                birthdays={data?.lists?.upcomingBirthdays ?? []}
                anniversaries={data?.lists?.workAnniversaries ?? []}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="chart-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CircleDollarSign size={18} style={{ color: 'var(--success)' }} />
                  Latest Salary
                </span>
                {data?.recentPayslip ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '1.1rem' }}>Month: {data.recentPayslip.month}</strong>
                        <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginTop: '1.5rem', ...fadeInUpStyle(120) }}>
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
