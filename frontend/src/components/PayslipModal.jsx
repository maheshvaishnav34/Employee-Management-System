import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';

const PayslipModal = ({ payroll, onClose }) => {
  if (!payroll) return null;

  const printAreaRef = useRef();

  const handlePrint = () => {
    const printContent = printAreaRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    // Temporarily replace page body with printable area and trigger window print
    document.body.innerHTML = `
      <html>
        <head>
          <title>Payslip_${payroll.employee.employeeId}_${payroll.month}</title>
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #333; }
            .payslip-invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .payslip-invoice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
            .payslip-invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .payslip-invoice-table th { background-color: #f7fafc; padding: 12px; text-align: left; border-bottom: 2px solid #edf2f7; color: #4a5568; font-weight: 600; }
            .payslip-invoice-table td { padding: 12px; border-bottom: 1px solid #edf2f7; }
            .payslip-invoice-footer { display: flex; justify-content: flex-end; font-size: 1.25rem; font-weight: 700; border-top: 2px solid #e2e8f0; padding-top: 20px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 99px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
            .badge-paid { background-color: rgba(16, 185, 129, 0.15); color: #10b981; }
            .badge-unpaid { background-color: rgba(239, 68, 68, 0.15); color: #ef4444; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `;
    window.print();
    window.location.reload(); // Quick restore of React state
  };

  const getMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '700px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Employee Payslip</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body" style={{ padding: 0 }}>
          {/* Printable Payslip Invoice Area */}
          <div ref={printAreaRef} className="payslip-invoice">
            <div className="payslip-invoice-header">
              <div>
                <h2>EMS HUB SYSTEMS INC.</h2>
                <p style={{ color: '#718096', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  100 Corporate Parkway, Suite 500<br />
                  New York, NY 10001
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ color: 'var(--primary-accent)' }}>PAYSLIP RECORD</h3>
                <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Period: <strong>{getMonthName(payroll.month)}</strong>
                </p>
                <div style={{ marginTop: '0.5rem' }}>
                  <span className={`badge badge-${payroll.status.toLowerCase()}`}>
                    {payroll.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="payslip-invoice-grid">
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#718096', fontWeight: 600 }}>
                  EMPLOYEE DETAILS
                </span>
                <div style={{ marginTop: '0.5rem', lineHeight: '1.5' }}>
                  <strong>{payroll.employee.firstName} {payroll.employee.lastName}</strong><br />
                  ID: {payroll.employee.employeeId}<br />
                  Role: {payroll.employee.designation}<br />
                  Dept: {payroll.employee.department?.name || 'Unassigned'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#718096', fontWeight: 600 }}>
                  PAYMENT SUMMARY
                </span>
                <div style={{ marginTop: '0.5rem', lineHeight: '1.5' }}>
                  Pay Date: {payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString() : 'Pending Release'}<br />
                  Email: {payroll.employee.email}<br />
                  Phone: {payroll.employee.phone || 'N/A'}<br />
                  Account Status: ACTIVE
                </div>
              </div>
            </div>

            <table className="payslip-invoice-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Earnings</th>
                  <th style={{ textAlign: 'right' }}>Deductions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Salary (Monthly)</td>
                  <td style={{ textAlign: 'right' }}>${payroll.baseSalary.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                </tr>
                <tr>
                  <td>Performance Bonus / Additions</td>
                  <td style={{ textAlign: 'right' }}>${payroll.bonuses.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                </tr>
                <tr>
                  <td>Tax & Leave Deductions</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right', color: '#e53e3e' }}>${payroll.deductions.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div className="payslip-invoice-footer">
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: '#718096', display: 'block', marginBottom: '0.25rem' }}>
                  NET SALARY DISBURSED
                </span>
                <span style={{ fontSize: '1.5rem', color: '#2d3748' }}>
                  ${payroll.netSalary.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={18} /> Print Payslip
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayslipModal;
