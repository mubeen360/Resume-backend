const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const nodemailer = require('nodemailer');
const streamifier = require('streamifier');
require('dotenv').config();

const router = express.Router();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: 'dqc50jeh3',
  api_key: '819447893111718',
  api_secret: '1sEjO3rN7gWA9iYAuVCtk7GUGlw',
});

// Set up local storage for temporary files
const localUpload = multer({ 
  storage: multer.memoryStorage() 
});

// Nodemailer Configuration for Gmail
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: "teamperfectresume@gmail.com",
    pass: "usnn jblr hnsw tved",  
  },
});

// Upload Single File Route
router.post('/upload', localUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded!' });
  }
  
  try {
    // Step 1: Get the file buffer from multer
    const fileBuffer = req.file.buffer;
    const originalFilename = req.file.originalname;
    
    // Step 2: Upload to Cloudinary using buffer
    const cloudinaryUpload = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'uploads',
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      
      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
    
    // Step 3: Send email with attachment
    const recipientEmail = req.body.email || "teamperfectresume@gmail.com";
    
    
    // Updated email template code for the upload route
const mailOptions = {
  from: "teamperfectresume@gmail.com",
  to: recipientEmail,
  subject: 'Resume Received - Professional Review Coming Soon',
  html: `
  <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume Received</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      border-radius: 12px;
      overflow: hidden;
    }
    .content {
      padding: 35px 30px;
    }
    .details {
      margin-top: 30px;
      background-color: #f9f9fc;
      padding: 20px;
      border-radius: 8px;
    }
    .details p {
      margin: 12px 0;
      display: flex;
      align-items: center;
    }
    .highlight {
      font-weight: 600;
      color: #3a36e0;
      margin-right: 8px;
      min-width: 140px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <div class="details">
        <h3>Your Upload Details:</h3>
        <p><span class="highlight">Original Filename:</span> ${originalFilename}</p>
        <p><span class="highlight">Upload Time:</span> ${new Date().toLocaleString()}</p>
        <p><span class="highlight">File URL:</span> <a href="${cloudinaryUpload.secure_url}" style="color: #3a36e0;">View Your Uploaded Resume</a></p>
        <p><span class="highlight">File ID:</span> ${cloudinaryUpload.public_id}</p>
      </div>
    </div>
  </div>
</body>
</html>

  `,
  attachments: [{
    filename: originalFilename,
    content: fileBuffer
  }]
};
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    console.log('Email sent to:', recipientEmail);
    
    res.status(200).json({
      message: 'File uploaded successfully and notification email sent with attachment!',
      url: cloudinaryUpload.secure_url,
      public_id: cloudinaryUpload.public_id,
      emailSentTo: recipientEmail
    });
  } catch (error) {
    console.error('Operation failed:', error);
    
    res.status(500).json({
      message: 'Operation failed',
      error: error.message
    });
  }
});

module.exports = router;