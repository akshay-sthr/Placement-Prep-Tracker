const nodemailer = require("nodemailer");
const { EMAIL_USER, EMAIL_PASS } = require("./env");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER, // your Gmail address
    pass: EMAIL_PASS, // 16-character Gmail App Password
  },
});

module.exports = transporter;
