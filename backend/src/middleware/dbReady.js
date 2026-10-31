const mongoose = require("mongoose");
const { getDbError } = require("../config/db");

module.exports = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "The database isn't connected. Start MongoDB and this page will reconnect on its own.",
      detail: getDbError(),
    });
  }
  next();
};
