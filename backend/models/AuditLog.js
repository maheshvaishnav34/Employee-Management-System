const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE_EMPLOYEE', 'UPDATE_EMPLOYEE', 'DELETE_EMPLOYEE',
        'CREATE_DEPARTMENT', 'UPDATE_DEPARTMENT', 'DELETE_DEPARTMENT',
        'APPROVE_LEAVE', 'REJECT_LEAVE', 'CREATE_LEAVE',
        'GENERATE_PAYROLL', 'UPDATE_PAYROLL',
        'MARK_ATTENDANCE', 'UPDATE_ATTENDANCE',
        'CHANGE_ROLE', 'USER_LOGIN', 'USER_LOGOUT',
        'EXPORT_REPORT',
        'UPDATE_SETTINGS', 'DATABASE_BACKUP', 'DATABASE_RESTORE',
      ],
    },
    entity: { type: String }, // e.g. 'Employee', 'Leave', 'Payroll'
    entityId: { type: mongoose.Schema.Types.ObjectId },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    details: { type: String, default: '' }, // Human-readable description
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', AuditLogSchema);
