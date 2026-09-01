const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    phone: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    salary: {
      type: Number,
      required: [true, 'Salary is required'],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    profileImage: {
      type: String,
      default: '',
    },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relationship: { type: String, default: '' },
    },
    address: {
      street: { type: String, default: '' },
      city:   { type: String, default: '' },
      state:  { type: String, default: '' },
      pincode:{ type: String, default: '' },
    },
    skills: {
      type: [String],
      default: [],
    },
    socialLinks: {
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
      twitter: { type: String, default: '' },
    },
    bio: {
      type: String,
      default: '',
    },
    coverImage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field for employee full name
EmployeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Employee', EmployeeSchema);
