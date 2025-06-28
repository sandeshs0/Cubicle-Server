// controllers/emailAccountController.js
const EmailAccount = require('../models/EmailAccount');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const mongoose = require('mongoose');

// @desc    Add new email account
// @route   POST /api/email-accounts
// @access  Private
exports.addEmailAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, displayName, smtp, auth } = req.body;
    
    // Check if email already exists for this user
    const existingAccount = await EmailAccount.findOne({
      user: req.user.id,
      email
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'Email account already exists'
      });
    }

    // Create new email account
    const emailAccount = new EmailAccount({
      user: req.user.id,
      email,
      displayName,
      smtp,
      auth,
      verificationToken: crypto.randomBytes(20).toString('hex'),
      verificationExpires: Date.now() + 24 * 3600000 // 24 hours
    });

    await emailAccount.save();
    
    // Send verification email
    await sendVerificationEmail(emailAccount);
    
    // Don't send back sensitive data
    emailAccount.auth = undefined;
    
    res.status(201).json({
      success: true,
      data: emailAccount,
      message: 'Email account added. Please verify your email.'
    });
  } catch (error) {
    console.error('Error adding email account:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error adding email account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify email account
// @route   GET /api/email-accounts/verify/:token
// @access  Public
// exports.verifyEmailAccount = async (req, res) => {
//   try {
//     const emailAccount = await EmailAccount.findOne({
//       verificationToken: req.params.token,
//     //   verificationExpires: { $gt: Date.now() + 24 * 3600000 }
//     });
//     console.log("verifying custom email account token",req.params.token);
//     console.log("emailAccount: ",emailAccount);

//     if (!emailAccount) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid or expired verification token'
//       });
//     }

//     emailAccount.verified = true;
//     emailAccount.verificationToken = undefined;
//     emailAccount.verificationExpires = undefined;
//     await emailAccount.save();

//     res.json({
//       success: true,
//       message: 'Email account verified successfully'
//     });
//   } catch (error) {
//     console.error('Error verifying email account:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error verifying email account'
//     });
//   }
// };

// @desc    Verify email account
// @route   GET /api/email-accounts/verify/:token
// @access  Public
exports.verifyEmailAccount = async (req, res) => {
    try {
      // First try to find and update in one atomic operation
      const result = await EmailAccount.findOneAndUpdate(
        {
          verificationToken: req.params.token,
          // verificationExpires: { $gt: Date.now() } // Uncomment if using expiration
        },
        {
          $set: { 
            verified: true,
            verificationToken: undefined,
            verificationExpires: undefined
          }
        },
        { 
          new: true
        }
      );
  
      console.log("Verification result:", result);
  
      if (!result) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        });
      }
  
      res.json({
        success: true,
        message: 'Email account verified successfully'
      });
    } catch (error) {
      console.error('Error verifying email account:', error);
      res.status(500).json({
        success: false,
        message: 'Error verifying email account',
        error: error.message
      });
    }
  };

// @desc    Get user's email accounts
// @route   GET /api/email-accounts
// @access  Private
exports.getEmailAccounts = async (req, res) => {
  try {
    const accounts = await EmailAccount.find({ user: req.user.id })
      .select('-auth.pass -verificationToken -verificationExpires');
    
    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Error getting email accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting email accounts'
    });
  }
};

// @desc    Set default email account
// @route   PUT /api/email-accounts/:id/set-default
// @access  Private
exports.setDefaultEmailAccount = async (req, res) => {
  try {
    const account = await EmailAccount.findOne({
      _id: req.params.id,
      user: req.user.id,
      verified: true
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Email account not found or not verified'
      });
    }

    account.isDefault = true;
    await account.save();

    res.json({
      success: true,
      message: 'Default email account updated'
    });
  } catch (error) {
    console.error('Error setting default email account:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting default email account'
    });
  }
};

// Helper function to send verification email
async function sendVerificationEmail(account) {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${account.verificationToken}`;
    
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
    //   secure: account.smtp.secure,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"${account.displayName}" <${account.email}>`,
      to: account.email,
      subject: 'Verify Your Email Account',
      html: `
        <p>Please click the link below to verify your email account:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>Or copy and paste this URL into your browser:</p>
        <p>${verificationUrl}</p>
      `
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

// @desc    Delete an email account
// @route   DELETE /api/email-accounts/:id
// @access  Private
exports.deleteEmailAccount = async (req, res) => {
    try {
      const emailAccount = await EmailAccount.findOneAndDelete({
        _id: req.params.id,
        user: req.user.id // Ensure the email account belongs to the requesting user
      });
  
      if (!emailAccount) {
        return res.status(404).json({
          success: false,
          message: 'Email account not found or you do not have permission to delete it'
        });
      }
  
      // If the deleted account was the default, set a new default if available
      if (emailAccount.isDefault) {
        const otherAccount = await EmailAccount.findOne({ 
          user: req.user.id,
          _id: { $ne: emailAccount._id }
        }).sort({ createdAt: 1 }); // Get the oldest account
  
        if (otherAccount) {
          otherAccount.isDefault = true;
          await otherAccount.save();
        }
      }
  
      res.json({
        success: true,
        message: 'Email account deleted successfully',
        data: {
          id: emailAccount._id,
          email: emailAccount.email
        }
      });
    } catch (error) {
      console.error('Error deleting email account:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting email account',
        error: error.message
      });
    }
  };

  // @desc    Check if user has a custom email account for sending emails
// @route   GET /api/email-accounts/check
// @access  Private
exports.checkEmailAccount = async (req, res) => {
  try {
    // Find the user's default verified email account
    const emailAccount = await EmailAccount.findOne({
      user: req.user.id,
      isDefault: true,
      verified: true
    }).select('email displayName smtp.host');

    if (emailAccount) {
      return res.json({
        hasCustomEmail: true,
        email: emailAccount.email,
        displayName: emailAccount.displayName,
        smtpHost: emailAccount.smtp.host
      });
    }

    // If no custom email account is found
    res.json({
      hasCustomEmail: false,
      systemEmail: process.env.EMAIL_USER,
      systemName: process.env.EMAIL_FROM_NAME || 'Cubicle'
    });

  } catch (error) {
    console.error('Error checking email account:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking email account',
      error: error.message
    });
  }
};
  