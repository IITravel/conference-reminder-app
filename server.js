const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

let conferenceData = [];

// Email transporter setup (use .env in production)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-password'
  }
});

const sendReminderEmail = (recipient, conferenceName, date) => {
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: recipient,
    subject: `Reminder: Settle advance for ${conferenceName}`,
    text: `The conference "${conferenceName}" on ${date} is over. Please settle the advance.`
  };
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error(err);
    else console.log('Email sent:', info.response);
  });
};

app.post('/upload', upload.single('excel'), (req, res) => {
  const workbook = XLSX.readFile(req.file.path);
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  conferenceData = data.map(item => ({
    name: item.Name,
    email: item.Email,
    conference: item.Conference,
    date: new Date(item.Date),
    notified: false
  }));

  fs.unlinkSync(req.file.path);
  res.redirect('/');
});

app.get('/data', (req, res) => {
  res.json(conferenceData);
});

setInterval(() => {
  const now = new Date();
  conferenceData.forEach(item => {
    if (!item.notified && item.date < now) {
      sendReminderEmail(item.email, item.conference, item.date.toDateString());
      item.notified = true;
    }
  });
}, 30 * 60 * 1000); // Every 30 minutes

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
