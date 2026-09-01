const mongoose = require('mongoose');

let dbPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (dbPromise) {
    return dbPromise;
  }

  const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employee_management';

  dbPromise = mongoose.connect(connUri, {
    serverSelectionTimeoutMS: 5000,
  }).then((conn) => {
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  }).catch((error) => {
    dbPromise = null;
    console.error(`Error connecting to MongoDB: ${error.message}`);
    throw error;
  });

  return dbPromise;
};

module.exports = connectDB;
