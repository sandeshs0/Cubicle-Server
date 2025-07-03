const path = require('path');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fs = require('fs').promises;

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'cubicle/clients',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{
            width: 500,
            height: 500,
            crop: 'limit'
        }]
    }
});

// Initialize multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const fileExt = path.extname(file.originalname).toLowerCase().substring(1); // Remove the dot
        const allowedExtensions = ['jpeg', 'jpg', 'png', 'webp'];
        
        // Log the file details for debugging
        console.log('File upload attempt:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            extname: fileExt,
            hasValidMime: allowedTypes.includes(file.mimetype),
            hasValidExt: allowedExtensions.includes(fileExt)
        });

        // Check MIME type first, then extension
        const isValidMime = allowedTypes.includes(file.mimetype);
        const isValidExt = allowedExtensions.includes(fileExt);

        // For blob files, we'll trust the MIME type
        if (file.originalname === 'blob' && isValidMime) {
            return cb(null, true);
        }

        // For regular files, check both MIME and extension
        if (isValidMime && isValidExt) {
            return cb(null, true);
        }
        
        cb(new Error(`File type not allowed. Please upload only ${allowedExtensions.join(', ')} files.`));
    }
});

// Configure storage for email attachments
const emailStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'cubicle/emails/attachments',
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
        resource_type: 'auto'
    }
});

// Initialize multer for email attachments
const uploadMultiple = multer({
    storage: emailStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 5 // Max 5 files
    },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpe?g|png|gif|bmp|pdf|docx?|xlsx?|pptx?|txt/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only images, PDFs, and Office documents are allowed.'));
    }
});

// Add Cloudinary URL to the file object
const processUpload = (req, res, next) => {
    if (!req.files) return next();
    
    req.files = req.files.map(file => ({
        ...file,
        // Cloudinary returns the URL in different properties depending on the upload method
        url: file.location || file.path || (file.transformed ? file.transformed.secure_url : null)
    }));
    
    next();
};

// Create separate upload configurations for different file types
const uploadProfileImage = (req, res, next) => {
    const uploadSingle = upload.single('profileImage');
    
    // Add error handling for file size limit
    uploadSingle(req, res, function(err) {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    success: false,
                    message: 'File size too large. Maximum size is 5MB.' 
                });
            }
            return res.status(400).json({ 
                success: false,
                message: err.message || 'Error uploading file' 
            });
        }
        next();
    });
};

const uploadCoverImage = (req, res, next) => {
    const uploadSingle = upload.single('coverImage');
    uploadSingle(req, res, function(err) {
        if (err) {
            return res.status(400).json({ msg: err.message || 'Error uploading file' });
        }
        next();
    });
};

const uploadEmailAttachments = (req, res, next) => {
    // Use .array() middleware for handling multiple files
    uploadMultiple.array('attachments', 5)(req, res, function(err) {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    success: false,
                    message: 'File size too large. Max 10MB per file.' 
                });
            } else if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ 
                    success: false,
                    message: 'Too many files. Maximum 5 files allowed.' 
                });
            } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({ 
                    success: false,
                    message: 'Unexpected field. Use \'attachments\' as field name.' 
                });
            }
            return res.status(400).json({ 
                success: false,
                message: err.message || 'Error uploading files' 
            });
        }
        next();
    });
};



const taskCoverStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'cubicle/task-covers',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1200, height: 630, crop: 'fill' }]
    }
  });


  const uploadTaskCover = multer({ 
    storage: taskCoverStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
      files: 1
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'), false);
      }
    }
  }).single('coverImage');


  const deleteFile = async (filePath) => {
    try {
      await fs.unlink(filePath);
      console.log(`Deleted file: ${filePath}`);
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
    }
  };

// Export upload middleware
module.exports = {
    uploadFile: upload.single('profileImage'),
    uploadProfileImage,
    uploadCoverImage,
    uploadEmailAttachments: [uploadEmailAttachments, processUpload], // Add processUpload to the middleware chain
    uploadMultiple: uploadMultiple, // Also export the raw multer instance if needed
    processUpload,
    uploadTaskCover,
    deleteFile
};
