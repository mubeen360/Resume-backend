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
    
    // Determine file extension for proper handling
    const fileExt = path.extname(originalFilename).toLowerCase();
    
    // Step 2: Upload to Cloudinary using buffer with specific resource_type for documents
    const cloudinaryUpload = await new Promise((resolve, reject) => {
      const uploadOptions = { 
        folder: 'uploads',
        resource_type: 'auto',
        format: 'auto',
        use_filename: true
      };
      
      // For .docx and other document files, ensure they're treated as 'raw' for proper download
      if (['.docx', '.doc', '.pdf', '.xlsx', '.xls', '.csv', '.pptx', '.ppt'].includes(fileExt)) {
        uploadOptions.resource_type = 'raw';
      }
      
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      
      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
    
    // Log upload details for debugging
    console.log('Cloudinary upload details:', {
      public_id: cloudinaryUpload.public_id,
      url: cloudinaryUpload.secure_url,
      resource_type: cloudinaryUpload.resource_type,
      format: cloudinaryUpload.format,
      original_filename: originalFilename
    });
    
    // Generate a direct download URL that will work for documents
    const downloadUrl = cloudinary.url(cloudinaryUpload.public_id, {
      resource_type: cloudinaryUpload.resource_type || 'raw',
      format: fileExt.replace('.', ''),
      flags: 'attachment',
      secure: true
    });
    
    // Step 3: Send email with attachment
    const recipientEmail = req.body.email || "teamperfectresume@gmail.com";
    
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
        .button {
          display: inline-block;
          background-color: #3a36e0;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 15px;
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
            <p><span class="highlight">File URL:</span> <a href="${downloadUrl}" style="color: #3a36e0;">View Your Uploaded Resume</a></p>
            <p><span class="highlight">File ID:</span> ${cloudinaryUpload.public_id}</p>
            <a href="${downloadUrl}" class="button">Download Your File</a>
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
      downloadUrl: downloadUrl,
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

// Add a dedicated download route for easier file retrieval
router.get('/download/:publicId', async (req, res) => {
  try {
    const publicId = req.params.publicId;
    
    // Get file information to determine the correct resource_type
    const fileInfo = await cloudinary.api.resource(publicId, { resource_type: 'raw' })
      .catch(() => cloudinary.api.resource(publicId, { resource_type: 'image' }))
      .catch(() => cloudinary.api.resource(publicId, { resource_type: 'video' }))
      .catch(() => null);
    
    if (!fileInfo) {
      return res.status(404).json({ message: 'File not found in Cloudinary' });
    }
    
    // Generate download URL with attachment flag
    const url = cloudinary.url(publicId, {
      resource_type: fileInfo.resource_type || 'raw',
      flags: 'attachment',
      secure: true
    });
    
    res.redirect(url);
  } catch (error) {
    console.error('Download failed:', error);
    res.status(500).json({
      message: 'Download failed',
      error: error.message
    });
  }
});

module.exports = router;