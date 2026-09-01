import React from 'react';
import { CircleDollarSign, TrendingUp, TrendingDown, Users } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

const PayrollSummaryWidget = ({ payroll = {} }) => {
  const { monthlyPayrollCost = 0, bonusTotal = 0, deductionTotal = 0, processedCount = 0 } = payroll;

  const items = [
    { label: 'Monthly Net Cost', value: fmt(monthlyPayrollCost), icon: CircleDollarSign, color: 'var(--primary-accent)', bg: 'rgba(103,119,239,0.1)' },
    { label: 'Total Bonuses', value: fmt(bonusTotal), icon: TrendingUp, color: 'var(--success)', bg: 'var(--success-bg)' },
    { label: 'Total Deductions', value: fmt(deductionTotal), icon: TrendingDown, color: 'var(--danger)', bg: 'var(--danger-bg)' },
    { label: 'Payrolls Processed', value: processedCount, icon: Users, color: 'var(--info)', bg: 'var(--info-bg)' },
  ];

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <CircleDollarSign size={18} style={{ color: 'var(--primary-accent)' }} />
        Payroll Overview
        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          Current Month
        </span>
      </span>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', flex: 1 }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} style={{
              padding: '0.85rem',
              background: item.bg,
              borderRadius: '12px',
              display: 'flex', flexDirection: 'column', gap: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Icon size={14} style={{ color: item.color }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: item.color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {item.label}
                </span>
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
                {item.value}
              </span>
            </div>
          );
        })}
      </div>

      {processedCount === 0 && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.82rem', marginTop: '0.75rem' }}>
          No payroll processed for current month yet
        </p>
      )}
    </div>
  );
};

export default PayrollSummaryWidget;
