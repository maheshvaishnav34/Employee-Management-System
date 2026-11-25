import { useState, useEffect } from "react";
import { api } from "../utils/api";
import {
  Play,
  Square,
  CheckCircle2,
  Calendar,
  Timer,
  TrendingUp,
  Clock,
  Zap,
  Coffee,
  AlertTriangle,
  Lock,
} from "lucide-react";
import {
  formatClockTime,
  formatClockTimeWithSec,
  formatMinutesDuration,
  getDailyStatusTheme,
  formatDailyStatusLabel,
} from "../utils/attendanceFormat";

const STATUS_COLORS = {
  Present: { bg: "#10b981", light: "rgba(16,185,129,0.16)", text: "#10b981" },
  Late: { bg: "#f59e0b", light: "rgba(245,158,11,0.16)", text: "#f59e0b" },
  "Half Day": { bg: "#f97316", light: "rgba(249,115,22,0.16)", text: "#f97316" },
  Absent: { bg: "#ef4444", light: "rgba(239,68,68,0.16)", text: "#ef4444" },
  Weekend: { bg: "transparent", light: "transparent", text: "var(--text-secondary)" },
};

const dotColor = (s) => STATUS_COLORS[s]?.bg || "rgba(148,163,184,0.2)";

const formatHMS = (ms) => {
  const safeMs = Math.max(0, ms);
  const ss = Math.floor((safeMs / 1000) % 60);
  const mm = Math.floor((safeMs / 60000) % 60);
  const hh = Math.floor(safeMs / 3600000);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(hh)}:${p(mm)}:${p(ss)}`;
};

/* ── Realtime Circular Clock & Progress Ring ── */
const ProgressRing = ({
  pct = 0,
  isWorking,
  activeSession,
  activeTimerStr,
  liveTotalMinutes,
  time,
  dailyStatus,
  workMode,
}) => {
  const R = 70;
  const CIRC = 2 * Math.PI * R;
  // Minimum visible blue arc when idle (like the realtime clock portal), scaling dynamically up to 100% as hours accrue
  const displayPct = isWorking || liveTotalMinutes > 0 ? Math.max(8, Math.min(pct, 100)) : 18;
  const dash = (displayPct / 100) * CIRC;

  const ringColor = isWorking
    ? "#10b981"
    : dailyStatus === "Daily Target Completed" || dailyStatus === "Daily Attendance Finalized"
      ? "#2563eb"
      : "#2563eb";

  return (
    <div style={{ position: "relative", width: 176, height: 176, flexShrink: 0, margin: "0.25rem 0" }}>
      <svg width={176} height={176} viewBox="0 0 176 176" style={{ position: "absolute", inset: 0 }}>
        <circle
          cx={88}
          cy={88}
          r={R}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={10}
          opacity={0.75}
        />
        <circle
          cx={88}
          cy={88}
          r={R}
          fill="none"
          stroke={ringColor}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          transform="rotate(-90 88 88)"
          style={{ transition: "stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1), stroke 0.35s ease" }}
        />
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          textAlign: "center",
          padding: "0 14px",
        }}
      >
        {isWorking && activeSession ? (
          <>
            <span
              style={{
                fontSize: "0.58rem",
                fontWeight: 800,
                color: "#10b981",
                background: "rgba(16,185,129,0.14)",
                padding: "0.12rem 0.5rem",
                borderRadius: 20,
                letterSpacing: "0.06em",
              }}
            >
              ● LIVE
            </span>
            <div
              style={{
                fontSize: "1.45rem",
                fontWeight: 900,
                fontFamily: "'Outfit', monospace",
                color: "var(--text-primary)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {activeTimerStr}
            </div>
            <span style={{ fontSize: "0.66rem", color: "#10b981", fontWeight: 700 }}>
              Total: {formatMinutesDuration(liveTotalMinutes)}
            </span>
            <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              {workMode}
            </span>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: "1.32rem",
                fontWeight: 900,
                fontFamily: "'Outfit', monospace",
                color: "var(--text-primary)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              {time.toLocaleDateString([], { month: "short", day: "numeric" })}
            </div>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 700,
                color: liveTotalMinutes > 0 ? "#2563eb" : "var(--text-secondary)",
                marginTop: 2,
              }}
            >
              {liveTotalMinutes > 0 ? `${formatMinutesDuration(liveTotalMinutes)} today` : "Not Clocked In"}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

/* ── Mini 7-day trend bar ── */
const DayBar = ({ day, idx, onHover, isHovered }) => {
  const h = day.hours ?? 0;
  const fillPct = day.status ? Math.min((h / 8) * 100, 100) : 0;
  const color = dotColor(day.status);
  const hasData = day.status && day.status !== "Weekend";

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        cursor: hasData ? "pointer" : "default",
        position: "relative",
      }}
      onMouseEnter={() => hasData && onHover(idx)}
      onMouseLeave={() => onHover(null)}
    >
      {isHovered && hasData && (
        <div
          style={{
            position: "absolute",
            bottom: "115%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: "0.55rem 0.75rem",
            fontSize: "0.66rem",
            whiteSpace: "nowrap",
            zIndex: 60,
            boxShadow: "var(--shadow-lg)",
            color: "var(--text-primary)",
            textAlign: "left",
            minWidth: 135,
          }}
        >
          <div style={{ fontWeight: 800, color, marginBottom: 4 }}>
            {new Date(day.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span>First In: <strong>{formatClockTime(day.clockIn)}</strong></span>
            <span>Last Out: <strong>{day.clockOut ? formatClockTime(day.clockOut) : "Active"}</strong></span>
            <span>Punches: <strong>{day.sessionsCount || 1}</strong></span>
            <span>Worked: <strong style={{ color }}>{formatMinutesDuration((day.hours || 0) * 60)}</strong></span>
          </div>
        </div>
      )}

      <div
        style={{
          width: 28,
          height: 50,
          background: "var(--bg-primary)",
          borderRadius: 8,
          position: "relative",
          overflow: "hidden",
          border: day.isToday ? `1.5px solid ${color || "var(--primary-accent)"}` : "1px solid var(--border-color)",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: `${fillPct}%`,
            background: color || "transparent",
            borderRadius: "0 0 6px 6px",
            transition: "height 0.5s ease",
            opacity: hasData ? 0.9 : 0,
          }}
        />
        {hasData && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.62rem",
              fontWeight: 800,
              color: "#fff",
              textShadow: "0 1px 2px rgba(0,0,0,0.45)",
            }}
          >
            {day.status === "Present" ? "✓" : day.status === "Late" ? "!" : day.status === "Absent" ? "✗" : "½"}
          </div>
        )}
      </div>

      <span style={{ fontSize: "0.58rem", fontWeight: day.isToday ? 800 : 600, color: day.isToday ? "var(--primary-accent)" : "var(--text-secondary)", lineHeight: 1 }}>
        {day.dayName}
      </span>
      <span style={{ fontSize: "0.54rem", color: "var(--text-secondary)", lineHeight: 1 }}>
        {day.hours !== null ? `${Number(day.hours).toFixed(1)}h` : "–"}
      </span>
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN ATTENDANCE CONSOLE WIDGET
══════════════════════════════════════════════ */
const AttendanceWidget = ({ onActionComplete }) => {
  const [statusData, setStatusData] = useState({
    clockedIn: false,
    clockedOut: false,
    isWorking: false,
    isPreviousDayActive: false,
    canClockIn: true,
    canClockOut: false,
    dailyStatus: "Not Started",
    activeSession: null,
    sessions: [],
    record: null,
    policy: { dailyTargetHours: 8, officeStartTime: "09:30", lateGraceMinutes: 15 },
    summary: {
      totalMinutes: 0,
      totalHours: 0,
      liveTotalMinutes: 0,
      liveTotalHours: 0,
      breakMinutes: 0,
      currentBreakMinutes: 0,
      completedSessions: 0,
      totalSessions: 0,
      activeMinutes: 0,
      targetHours: 8,
      remainingHours: 8,
      overtimeHours: 0,
      firstClockIn: null,
      lastClockOut: null,
      isFinalized: false,
      status: null,
    },
  });

  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [activeTimerStr, setActiveTimerStr] = useState("00:00:00");
  const [liveTotalMinutes, setLiveTotalMinutes] = useState(0);
  const [workMode, setWorkMode] = useState("Office");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [weekDays, setWeekDays] = useState([]);
  const [weekTotal, setWeekTotal] = useState(0);
  const [tooltipDay, setTooltipDay] = useState(null);

  const fetchToday = async () => {
    try {
      const d = await api.get("/attendance/today-status");
      if (d.success) {
        setStatusData((prev) => ({
          ...prev,
          ...d,
          summary: { ...prev.summary, ...(d.summary || {}) },
          policy: { ...prev.policy, ...(d.policy || {}) },
        }));
        if (d.activeSession?.workMode) {
          setWorkMode(d.activeSession.workMode);
        } else if (d.record?.workMode) {
          setWorkMode(d.record.workMode);
        }
      }
    } catch {
      // Keep last known view cleanly
    }
  };

  const fetchWeekly = async () => {
    try {
      const d = await api.get("/attendance/weekly-summary");
      if (d.success) {
        setWeekDays(d.days || []);
        setWeekTotal(d.weekTotal || 0);
      }
    } catch {
      // Optional weekly summary fallback
    }
  };

  useEffect(() => {
    fetchToday();
    fetchWeekly();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Recompute live elapsed session timer & total working minutes every second while active
  useEffect(() => {
    const updateLive = () => {
      const completedMins = Number(statusData.summary?.totalMinutes || 0);
      if (statusData.isWorking && statusData.activeSession?.clockInTime) {
        const diffMs = Math.max(0, Date.now() - new Date(statusData.activeSession.clockInTime).getTime());
        setActiveTimerStr(formatHMS(diffMs));
        setLiveTotalMinutes(completedMins + diffMs / 60000);
      } else {
        setActiveTimerStr("00:00:00");
        setLiveTotalMinutes(completedMins);
      }
    };
    updateLive();
    if (!statusData.isWorking) return undefined;
    const iv = setInterval(updateLive, 1000);
    return () => clearInterval(iv);
  }, [statusData.isWorking, statusData.activeSession, statusData.summary?.totalMinutes]);

  const handleClockIn = async () => {
    if (loading || !statusData.canClockIn) return;
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const d = await api.post("/attendance/clockin", { workMode });
      if (d.success) {
        setSuccess(d.message || "Clocked in successfully!");
        await fetchToday();
        await fetchWeekly();
        onActionComplete?.();
      }
    } catch (e) {
      setError(e.message || "Clock-in failed");
      await fetchToday();
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (loading || !statusData.canClockOut) return;
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const d = await api.post("/attendance/clockout", {});
      if (d.success) {
        setSuccess(d.message || "Clocked out successfully!");
        await fetchToday();
        await fetchWeekly();
        onActionComplete?.();
      }
    } catch (e) {
      setError(e.message || "Clock-out failed");
      await fetchToday();
    } finally {
      setLoading(false);
    }
  };

  const targetHours = Number(statusData.summary?.targetHours || statusData.policy?.dailyTargetHours || 8);
  const ringPct = targetHours > 0 ? Math.min((liveTotalMinutes / 60 / targetHours) * 100, 100) : 0;
  const remainingMinutes = Math.max(0, targetHours * 60 - liveTotalMinutes);
  const dailyTheme = getDailyStatusTheme(statusData.dailyStatus);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1.5rem 1.4rem",
        borderRadius: 18,
        border: "1px solid var(--border-color)",
        boxShadow: "var(--shadow-md)",
        background: "var(--bg-card)",
        gap: "0.95rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Portal Header matching Attendance Console design ── */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 800,
              color: "#2563eb",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Timer size={13} /> REALTIME PUNCH PORTAL
          </span>
          <span
            style={{
              fontSize: "0.66rem",
              fontWeight: 700,
              padding: "0.18rem 0.6rem",
              borderRadius: 20,
              background: dailyTheme.bg,
              color: dailyTheme.color,
              border: `1px solid ${dailyTheme.border}`,
            }}
          >
            {formatDailyStatusLabel(statusData.dailyStatus)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          <h3
            style={{
              fontSize: "1.22rem",
              fontWeight: 800,
              margin: 0,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Attendance Console
          </h3>
          <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
            <Calendar size={12} />
            {time.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>
      </div>

      {/* ── Circular Realtime Clock / Progress Ring ── */}
      <ProgressRing
        pct={ringPct}
        isWorking={statusData.isWorking}
        activeSession={statusData.activeSession}
        activeTimerStr={activeTimerStr}
        liveTotalMinutes={liveTotalMinutes}
        time={time}
        dailyStatus={statusData.dailyStatus}
        workMode={workMode}
      />

      {/* ── Previous-day open session warning ── */}
      {statusData.isPreviousDayActive && statusData.activeSession && (
        <div
          style={{
            width: "100%",
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 10,
            padding: "0.55rem 0.8rem",
            fontSize: "0.75rem",
            color: "#d97706",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            Active punch #{statusData.activeSession.sessionNumber} from{" "}
            {new Date(statusData.activeSession.clockInTime).toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
            is still open. Clock Out to close it before punching in again.
          </span>
        </div>
      )}

      {/* ── Feedback Banners ── */}
      {error && (
        <div
          style={{
            width: "100%",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.28)",
            borderRadius: 10,
            padding: "0.55rem 0.8rem",
            fontSize: "0.76rem",
            color: "#ef4444",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            width: "100%",
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.28)",
            borderRadius: 10,
            padding: "0.55rem 0.8rem",
            fontSize: "0.76rem",
            color: "#059669",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {/* ── Dynamic Punch Action Area ── */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {statusData.summary?.isFinalized ? (
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: 12,
              padding: "0.75rem",
              color: "#6366f1",
              fontWeight: 700,
              fontSize: "0.84rem",
            }}
          >
            <Lock size={15} /> Daily Attendance Finalized
          </div>
        ) : statusData.isWorking ? (
          <>
            {/* Active Work Live Strip */}
            <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "Punch In", value: formatClockTime(statusData.activeSession?.clockInTime) },
                { label: "Current Work", value: activeTimerStr },
                { label: "Today Total", value: formatMinutesDuration(liveTotalMinutes) },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 10,
                    padding: "0.5rem 0.35rem",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleClockOut}
              disabled={loading || !statusData.canClockOut}
              style={{
                width: "100%",
                padding: "0.85rem",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: "0.92rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                border: "none",
                boxShadow: "0 6px 18px rgba(239,68,68,0.3)",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              <Square size={14} fill="white" />
              {loading ? "Clocking Out…" : "Clock Out"}
            </button>
          </>
        ) : (
          <>
            {/* Work Mode Selector */}
            <div
              style={{
                display: "flex",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {["Office", "WFH", "Hybrid"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setWorkMode(m)}
                  style={{
                    flex: 1,
                    padding: "0.48rem 0.25rem",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    border: "none",
                    background: workMode === m ? "rgba(37,99,235,0.12)" : "transparent",
                    color: workMode === m ? "#2563eb" : "var(--text-secondary)",
                    cursor: "pointer",
                    borderRight: m !== "Hybrid" ? "1px solid var(--border-color)" : "none",
                  }}
                >
                  {m === "Office" ? "🏢" : m === "WFH" ? "💻" : "🔀"} {m}
                </button>
              ))}
            </div>

            {/* Clock In Button */}
            <button
              onClick={handleClockIn}
              disabled={loading || !statusData.canClockIn}
              style={{
                width: "100%",
                padding: "0.85rem",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: "0.92rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                border: "none",
                boxShadow: "0 6px 18px rgba(37,99,235,0.3)",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              <Play size={15} fill="white" />
              {loading ? "Clocking In…" : "Clock In"}
            </button>
          </>
        )}
      </div>

      {/* ── Daily Work Metrics Grid ── */}
      <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          {
            label: "Total Worked",
            value: formatMinutesDuration(liveTotalMinutes),
            icon: <Clock size={12} color="#2563eb" />,
          },
          {
            label: "Total Break",
            value: formatMinutesDuration(statusData.summary?.breakMinutes || 0),
            icon: <Coffee size={12} color="#f59e0b" />,
          },
          {
            label: "Punches Today",
            value: `${statusData.summary?.completedSessions || 0} / ${statusData.summary?.totalSessions || 0}`,
            icon: <Zap size={12} color="#10b981" />,
          },
          {
            label: remainingMinutes > 0 ? "Remaining Target" : "Target Reached",
            value: remainingMinutes > 0 ? formatMinutesDuration(remainingMinutes) : `${targetHours}h ✓`,
            icon: <TrendingUp size={12} color="#6366f1" />,
          },
        ].map((metric) => (
          <div
            key={metric.label}
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: 10,
              padding: "0.55rem 0.7rem",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span style={{ fontSize: "0.64rem", fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              {metric.icon} {metric.label}
            </span>
            <strong style={{ fontSize: "0.84rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {metric.value}
            </strong>
          </div>
        ))}
      </div>

      {/* ── Today's Attendance Session History ── */}
      {statusData.sessions && statusData.sessions.length > 0 && (
        <div
          style={{
            width: "100%",
            borderTop: "1px solid var(--border-color)",
            paddingTop: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Today's Punch Logs ({statusData.sessions.length})
            </span>
            <span style={{ fontSize: "0.66rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Target: {targetHours}h
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 170, overflowY: "auto" }}>
            {statusData.sessions.map((s) => {
              const isOpen = !s.clockOutTime;
              return (
                <div
                  key={s._id || s.sessionNumber}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.45rem 0.65rem",
                    borderRadius: 8,
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.74rem",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: "0.68rem",
                        padding: "0.1rem 0.4rem",
                        borderRadius: 6,
                        background: isOpen ? "rgba(16,185,129,0.14)" : "rgba(37,99,235,0.1)",
                        color: isOpen ? "#10b981" : "#2563eb",
                      }}
                    >
                      #{s.sessionNumber}
                    </span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {formatClockTimeWithSec(s.clockInTime)} → {isOpen ? "Active" : formatClockTimeWithSec(s.clockOutTime)}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, color: isOpen ? "#10b981" : "var(--text-primary)" }}>
                      {isOpen ? "Live" : formatMinutesDuration(s.durationMinutes)}
                    </span>
                    <span style={{ fontSize: "0.64rem", color: "var(--text-secondary)" }}>
                      {s.workMode}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 7-Day Trend ── */}
      {weekDays.length > 0 && (
        <div style={{ width: "100%", borderTop: "1px solid var(--border-color)", paddingTop: "0.8rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.66rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 4 }}>
              <TrendingUp size={11} /> 7-Day Trend
            </span>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--primary-accent)" }}>
              Week: {formatMinutesDuration(weekTotal * 60)}
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.3rem", justifyContent: "space-between", alignItems: "flex-end" }}>
            {weekDays.map((day, idx) => (
              <DayBar key={idx} day={day} idx={idx} onHover={setTooltipDay} isHovered={tooltipDay === idx} />
            ))}
          </div>
        </div>
      )}

      {/* ── Footer matching screenshot ("Punch In: ... LATE") ── */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.72rem",
          color: "var(--text-secondary)",
          borderTop: "1px solid var(--border-color)",
          paddingTop: "0.65rem",
        }}
      >
        {statusData.summary?.firstClockIn ? (
          <>
            <span>
              Punch In:{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {formatClockTimeWithSec(statusData.summary.firstClockIn)}
              </strong>
            </span>
            <span
              style={{
                fontWeight: 800,
                padding: "0.14rem 0.55rem",
                borderRadius: 12,
                background: STATUS_COLORS[statusData.summary?.status]?.light || "rgba(37,99,235,0.12)",
                color: STATUS_COLORS[statusData.summary?.status]?.text || "#2563eb",
                fontSize: "0.65rem",
                textTransform: "uppercase",
              }}
            >
              {statusData.summary?.status || "Present"}
            </span>
          </>
        ) : (
          <>
            <span>Shift: {statusData.policy?.businessHours || "09:30 AM – 06:30 PM"}</span>
            <span style={{ color: "#2563eb", fontWeight: 700 }}>{targetHours}h target</span>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceWidget;
