const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password, not the normal login password
  },
});

// Sends the signup OTP to the admin's Gmail so they can hand it to the requesting staff member
const sendOtpEmail = async ({ requesterName, requesterUsername, otp }) => {
  const mailOptions = {
    from: `"Daily Collection App" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `Signup Request — ${requesterName} (${requesterUsername})`,
    html: `
      <p>Naya staff signup ki request aayi hai:</p>
      <p><b>Name:</b> ${requesterName}<br/>
         <b>Username:</b> ${requesterUsername}</p>
      <p>Approve karne ke liye ye OTP unhe de dein:</p>
      <h2 style="letter-spacing: 4px;">${otp}</h2>
      <p style="color:#888; font-size: 13px;">Ye OTP 10 minute me expire ho jayega.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Sends a password-reset OTP to the admin's Gmail
const sendPasswordResetOtp = async ({ name, username, otp }) => {
  const mailOptions = {
    from: `"Daily Collection App" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `Password Reset Request — ${name} (${username})`,
    html: `
      <p><b>${name}</b> (username: ${username}) apna password reset karna chahte hain.</p>
      <p>Approve karne ke liye ye OTP unhe de dein:</p>
      <h2 style="letter-spacing: 4px;">${otp}</h2>
      <p style="color:#888; font-size: 13px;">Ye OTP 10 minute me expire ho jayega. Agar aapne ye request nahi ki/manzoor nahi ki, ise ignore kar dein.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail, sendPasswordResetOtp };
