// models/EmailAccount.js
const mongoose = require('mongoose');
const crypto = require('crypto');
const validator = require('validator');


const emailAccountSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
    unique: true
  },
  displayName: { 
    type: String,
    required: [true, 'Display name is required']
  },
  smtp: {
    host: { 
      type: String, 
      required: [true, 'SMTP host is required'] 
    },
    port: { 
      type: Number, 
      required: [true, 'SMTP port is required'],
      min: 1,
      max: 65535
    },
    secure: { 
      type: Boolean, 
      default: true 
    }
  },
  auth: {
    user: { 
      type: String, 
      required: [true, 'SMTP username is required'] 
    },
    pass: { 
      type: String, 
      required: [true, 'SMTP password is required'],
      select: false
    }
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  },
  verified: { 
    type: Boolean, 
    default: false 
  },
  verificationToken: String,
  verificationExpires: Date
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

// Encrypt password before saving
// emailAccountSchema.pre('save', async function(next) {
//   if (!this.isModified('auth.pass') || !this.auth.pass) return next();
  
//   try {
//     const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
//     const iv = crypto.randomBytes(16);
//     const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
//     let encrypted = cipher.update(this.auth.pass, 'utf8', 'hex');
//     encrypted += cipher.final('hex');
    
//     this.auth.pass = `${iv.toString('hex')}:${encrypted}`;
//     next();
//   } catch (error) {
//     console.error('Error encrypting password:', error);
//     next(error);
//   }
// });

// // Method to decrypt password
// emailAccountSchema.methods.decryptPassword = function() {
//   if (!this.auth || !this.auth.pass) return null;
  
//   try {
//     const [ivHex, encrypted] = this.auth.pass.split(':');
//     if (!ivHex || !encrypted) return null;
    
//     const iv = Buffer.from(ivHex, 'hex');
//     const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
//     const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
//     let decrypted = decipher.update(encrypted, 'hex', 'utf8');
//     decrypted += decipher.final('utf8');
//     return decrypted;
//   } catch (error) {
//     console.error('Error decrypting password:', error);
//     return null;
//   }
// };

// Ensure only one default email per user
emailAccountSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    try {
      await this.constructor.updateMany(
        { user: this.user, _id: { $ne: this._id } },
        { $set: { isDefault: false } }
      );
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Add index for faster queries
emailAccountSchema.index({ user: 1, isDefault: 1 });
emailAccountSchema.index({ user: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('EmailAccount', emailAccountSchema);