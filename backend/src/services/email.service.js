const transporter = require("../config/mailer");
const { EMAIL_USER } = require("../config/env");

const sendOtpEmail = (email, otp) =>
  transporter.sendMail({
    from: `"Placement Prep Tracker" <${EMAIL_USER}>`,
    to: email,
    subject: "Your Password Reset OTP",
    text: `Your OTP for resetting your password is: ${otp}. It expires in 10 minutes.`,
    html: `<p>Your OTP for resetting your password is: <b>${otp}</b></p><p>This OTP will expire in 10 minutes.</p>`,
  });

module.exports = { sendOtpEmail };
