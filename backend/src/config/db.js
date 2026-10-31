const mongoose = require("mongoose");
const { MONGODB_URI } = require("./env");

let dbError = null;

// If MongoDB isn't running yet, keep retrying so you can start it later
// without restarting this server.
async function connectWithRetry() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    dbError = null;
    console.log("MongoDB connected");
  } catch (err) {
    dbError = err.message;
    console.error(`MongoDB not reachable (${err.message}). Retrying in 5 seconds...`);
    setTimeout(connectWithRetry, 5000);
  }
}

const getDbError = () => dbError;

module.exports = { connectWithRetry, getDbError };
