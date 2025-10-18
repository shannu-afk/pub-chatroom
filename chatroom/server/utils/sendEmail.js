// server/utils/sendEmail.js
const nodemailer = require('nodemailer');

async function sendEmail({ to, subject, text, html }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html
  };

  await transporter.verify(); // throws if server not reachable / auth fails
  return transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
