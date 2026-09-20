const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// Sends the signup OTP to the admin's email
const sendOtpEmail = async ({ requesterName, requesterUsername, otp }) => {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [process.env.ADMIN_EMAIL],
    subject: `Signup Request — ${requesterName} (${requesterUsername})`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Daily Collection App</h2>

        <p>Naya staff signup request aaya hai:</p>

        <p>
          <b>Name:</b> ${requesterName}<br/>
          <b>Username:</b> ${requesterUsername}
        </p>

        <p>Approve karne ke liye ye OTP staff ko de dein:</p>

        <h2 style="
          letter-spacing: 6px;
          font-size: 28px;
          background: #f3f4f6;
          padding: 12px;
          display: inline-block;
        ">
          ${otp}
        </h2>

        <p style="color:#888; font-size:13px;">
          Ye OTP 10 minute mein expire ho jayega.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend signup email error:", error);
    throw new Error(error.message || "OTP email send nahi ho paya");
  }

  console.log("Signup OTP email sent:", data?.id);
};

// Sends password reset OTP to the admin's email
const sendPasswordResetOtp = async ({ name, username, otp }) => {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [process.env.ADMIN_EMAIL],
    subject: `Password Reset Request — ${name} (${username})`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Daily Collection App</h2>

        <p>
          <b>${name}</b>
          (username: ${username})
          apna password reset karna chahte hain.
        </p>

        <p>Approve karne ke liye ye OTP staff ko de dein:</p>

        <h2 style="
          letter-spacing: 6px;
          font-size: 28px;
          background: #f3f4f6;
          padding: 12px;
          display: inline-block;
        ">
          ${otp}
        </h2>

        <p style="color:#888; font-size:13px;">
          Ye OTP 10 minute mein expire ho jayega.
          Agar aapne ye request nahi ki hai, ise ignore kar dein.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend password reset email error:", error);
    throw new Error(
      error.message || "Password reset OTP email send nahi ho paya",
    );
  }

  console.log("Password reset OTP email sent:", data?.id);
};

module.exports = {
  sendOtpEmail,
  sendPasswordResetOtp,
};
