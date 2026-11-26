const mongoose = require('mongoose');

let dbPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Only reuse an in-flight connection attempt while Mongoose is actively connecting
  if (mongoose.connection.readyState === 2 && dbPromise) {
    return dbPromise;
  }

  dbPromise = null;
  const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employee_management';

  const isAtlas = connUri.includes('mongodb+srv');

  dbPromise = mongoose.connect(connUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    ...(isAtlas && {
      tls: true,
      tlsAllowInvalidCertificates: false,
      retryWrites: true,
    }),
  }).then((conn) => {
    dbPromise = null;
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

