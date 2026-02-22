const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = async (to, subject, html) => {
  // console.log("Sending email to:", to);
  // console.log("Email subject:", subject);
  // console.log("Email HTML content:", html);

  // console.log("Email transporter configuration:", transporter.options);
  // console.log(
  //   "Testing transporter connection...",
  //   process.env.EMAIL_USER,
  //   process.env.EMAIL_PASS,
  // );
  await transporter.sendMail({
    from: `"Aroma Store" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
