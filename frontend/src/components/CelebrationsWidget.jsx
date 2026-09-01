import React, { useState } from 'react';
import { Cake, Trophy, Sparkles, Gift, Calendar, User } from 'lucide-react';

const CelebrationsWidget = ({ birthdays = [], anniversaries = [] }) => {
  const [activeTab, setActiveTab] = useState('birthdays');

  const tabStyle = (tab) => ({
    flex: 1,
    padding: '0.45rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    transition: 'all 0.15s ease',
    background: activeTab === tab ? 'var(--primary-accent)' : 'transparent',
    color: activeTab === tab ? '#ffffff' : 'var(--text-secondary)',
    boxShadow: activeTab === tab ? '0 4px 12px rgba(103, 119, 239, 0.25)' : 'none',
  });

  const upcomingHolidays = [
    { name: 'Independence Day', date: 'August 15, 2026', day: 'Saturday' },
    { name: 'Gandhi Jayanti', date: 'October 02, 2026', day: 'Friday' },
    { name: 'Diwali', date: 'November 08, 2026', day: 'Sunday' },
    { name: 'Christmas Day', date: 'December 25, 2026', day: 'Friday' },
    { name: 'New Year\'s Day', date: 'January 01, 2027', day: 'Friday' },
  ];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
      
      {/* Header */}
      <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem', margin: 0 }}>
        <Sparkles size={18} style={{ color: 'var(--warning)' }} />
        Workspace Celebrations & Events
      </span>

      {/* Tabs Container */}
      <div style={{
        display: 'flex',
        padding: '0.25rem',
        background: 'rgba(0, 0, 0, 0.03)',
        borderRadius: '10px',
        marginBottom: '0.85rem',
        border: '1px solid var(--border-color)'
      }}>
        <button
          onClick={() => setActiveTab('birthdays')}
          style={tabStyle('birthdays')}
        >
          <Cake size={13} />
          Birthdays ({birthdays.length})
        </button>
        <button
          onClick={() => setActiveTab('anniversaries')}
          style={tabStyle('anniversaries')}
        >
          <Trophy size={13} />
          Annys ({anniversaries.length})
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          style={tabStyle('holidays')}
        >
          <Calendar size={13} />
          Holidays ({upcomingHolidays.length})
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '240px', paddingRight: '2px' }}>
        {activeTab === 'birthdays' && (
          /* Birthdays Tab */
          birthdays.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.75rem 0', color: 'var(--text-secondary)' }}>
              <Gift size={28} style={{ opacity: 0.25, marginBottom: '0.4rem' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>No birthdays this week</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {birthdays.map((emp) => {
                const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`;
                return (
                  <div
                    key={emp._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '10px',
                      border: emp.isToday ? '1px solid rgba(255, 177, 25, 0.3)' : '1px solid var(--border-color)',
                      background: emp.isToday 
                        ? 'linear-gradient(135deg, rgba(255, 177, 25, 0.06) 0%, rgba(245, 158, 11, 0.02) 100%)' 
                        : 'var(--bg-primary)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {/* Avatar */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: emp.isToday 
                          ? 'linear-gradient(135deg, #ffb119 0%, #f59e0b 100%)'
                          : 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}>
                        {initials}
                      </div>

                      {/* Name & Details */}
                      <div>
                        <strong style={{ fontSize: '0.82rem', display: 'block', color: 'var(--text-primary)' }}>
                          {emp.firstName} {emp.lastName}
                        </strong>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                          {emp.designation} · {emp.department?.name}
                        </span>
                      </div>
                    </div>

                    {/* Celebration Details Badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                      {emp.isToday ? (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          background: 'linear-gradient(135deg, #ffb119 0%, #f59e0b 100%)',
                          color: '#ffffff',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.15rem',
                          boxShadow: '0 2px 6px rgba(255, 177, 25, 0.3)',
                          animation: 'pulse 1.5s infinite'
                        }}>
                          <Sparkles size={8} /> TODAY! 🎉
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary-accent)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Calendar size={10} />
                          {emp.birthdayDate}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {activeTab === 'anniversaries' && (
          /* Anniversaries Tab */
          anniversaries.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.75rem 0', color: 'var(--text-secondary)' }}>
              <Trophy size={28} style={{ opacity: 0.25, marginBottom: '0.4rem' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>No work anniversaries this month</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {anniversaries.map((emp) => {
                const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`;
                const years = emp.yearsCompleted;

                return (
                  <div
                    key={emp._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {/* Avatar */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2ebd7f 0%, #157a4c 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}>
                        {initials}
                      </div>

                      {/* Name & Details */}
                      <div>
                        <strong style={{ fontSize: '0.82rem', display: 'block', color: 'var(--text-primary)' }}>
                          {emp.firstName} {emp.lastName}
                        </strong>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                          Joined {new Date(emp.joiningDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>

                    {/* Milestone Badge */}
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        background: 'rgba(46, 189, 127, 0.08)',
                        color: '#2ebd7f',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}>
                        <Trophy size={10} />
                        {years} {years === 1 ? 'Year' : 'Years'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {activeTab === 'holidays' && (
          /* Holidays Tab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {upcomingHolidays.map((holiday, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {/* Icon */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ff7043 0%, #ff5722 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}>
                    <Calendar size={14} />
                  </div>

                  {/* Holiday Name */}
                  <div>
                    <strong style={{ fontSize: '0.82rem', display: 'block', color: 'var(--text-primary)' }}>
                      {holiday.name}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      National Holiday
                    </span>
                  </div>
                </div>

                {/* Holiday Date */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--primary-accent)' }}>
                    {holiday.date}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-secondary)' }}>
                    {holiday.day}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CelebrationsWidget;
