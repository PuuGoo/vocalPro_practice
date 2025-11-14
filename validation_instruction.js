import { body, param, query, validationResult } from 'express-validator';

// ==========================================
// VALIDATION MIDDLEWARE
// ==========================================

/\*\*

- Validation middleware factory
- Chạy tất cả validation chains và return errors nếu có
-
- @param {Array} validations - Array of express-validator validation chains
- @returns {Function} Express middleware function
-
- @example
- router.post('/register',
- validate(registerSchema),
- async (req, res) => {
-     // Code here chỉ chạy nếu validation pass
- }
- );
  \*/
  export const validate = (validations) => {
  return async (req, res, next) => {
  // Run all validation chains in parallel
  await Promise.all(validations.map(validation => validation.run(req)));

      // Collect all validation errors
      const errors = validationResult(req);

      // If no errors, continue to next middleware
      if (errors.isEmpty()) {
        return next();
      }

      // Format errors and return 400 Bad Request
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.path || err.param,      // Field name (email, password, etc.)
          message: err.msg,                   // Error message
          value: err.value,                   // Invalid value submitted
          location: err.location || 'body'    // Where error occurred (body, params, query)
        }))
      });

  };
  };

// ==========================================
// AUTHENTICATION VALIDATION SCHEMAS
// ==========================================

/\*\*

- Registration validation schema
- Validates: email format, password strength, name length
-
- Password requirements:
- - Min 8 characters
- - At least 1 lowercase letter (a-z)
- - At least 1 uppercase letter (A-Z)
- - At least 1 digit (0-9)
-
- @example
- Valid: { email: "user@example.com", password: "Password123", name: "John Doe" }
- Invalid: { email: "invalid", password: "weak", name: "A" }
  \*/
  export const registerSchema = [
  body('email')
  .trim() // Remove leading/trailing whitespace
  .notEmpty().withMessage('Email is required')
  .isEmail().withMessage('Invalid email format')
  .normalizeEmail() // Lowercase + remove dots from Gmail
  .isLength({ max: 255 }).withMessage('Email too long (max 255 characters)')
  .custom(email => {
  // Additional check: email must not contain spaces after normalization
  if (email.includes(' ')) {
  throw new Error('Email cannot contain spaces');
  }
  return true;
  }),

body('password')
.notEmpty().withMessage('Password is required')
.isLength({ min: 8, max: 128 })
.withMessage('Password must be 8-128 characters')
.matches(/^(?=._[a-z])(?=._[A-Z])(?=.\*\d)/)
.withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
.custom(password => {
// Check for common weak passwords
const weakPasswords = ['Password123', '12345678', 'Qwerty123', 'Admin123'];
if (weakPasswords.includes(password)) {
throw new Error('Password is too common, please choose a stronger one');
}
return true;
}),

body('name')
.optional({ nullable: true, checkFalsy: true }) // Allow null, undefined, or empty string
.trim()
.isLength({ min: 2, max: 50 })
.withMessage('Name must be 2-50 characters')
.matches(/^[a-zA-Z\s'-]+$/)
.withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
.custom(name => {
// Check for multiple consecutive spaces
if (/\s{2,}/.test(name)) {
throw new Error('Name cannot contain multiple consecutive spaces');
}
return true;
})
];

/\*\*

- Login validation schema
- Validates: email format, password presence
-
- Note: Không check password strength khi login (chỉ check khi register)
-
- @example
- Valid: { email: "user@example.com", password: "anypassword" }
- Invalid: { email: "invalid", password: "" }
  \*/
  export const loginSchema = [
  body('email')
  .trim()
  .notEmpty().withMessage('Email is required')
  .isEmail().withMessage('Invalid email format')
  .normalizeEmail(),

body('password')
.notEmpty().withMessage('Password is required')
.isString().withMessage('Password must be a string')
];

/\*\*

- Password reset request schema
- Validates: email format
  \*/
  export const passwordResetRequestSchema = [
  body('email')
  .trim()
  .notEmpty().withMessage('Email is required')
  .isEmail().withMessage('Invalid email format')
  .normalizeEmail()
  ];

/\*\*

- Password reset schema
- Validates: token, new password
  \*/
  export const passwordResetSchema = [
  body('token')
  .notEmpty().withMessage('Reset token is required')
  .isLength({ min: 32, max: 64 }).withMessage('Invalid reset token'),

body('newPassword')
.notEmpty().withMessage('New password is required')
.isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
.matches(/^(?=._[a-z])(?=._[A-Z])(?=.\*\d)/)
.withMessage('Password must contain uppercase, lowercase, and number')
];

/\*\*

- Change password schema
- Validates: current password, new password
  \*/
  export const changePasswordSchema = [
  body('currentPassword')
  .notEmpty().withMessage('Current password is required'),

body('newPassword')
.notEmpty().withMessage('New password is required')
.isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
.matches(/^(?=._[a-z])(?=._[A-Z])(?=.\*\d)/)
.withMessage('Password must contain uppercase, lowercase, and number')
.custom((newPassword, { req }) => {
if (newPassword === req.body.currentPassword) {
throw new Error('New password must be different from current password');
}
return true;
})
];

// ==========================================
// VOCABULARY VALIDATION SCHEMAS
// ==========================================

/\*\*

- Vocabulary creation/update schema
- Validates: word, definition, example, pronunciation, etc.
-
- @example
- Valid: {
- word: "elaborate",
- definition: "Add more detail or information",
- example: "Please elaborate on your answer.",
- pronunciation: "/ɪˈlæb.ə.reɪt/",
- partOfSpeech: "verb",
- difficulty: 3
- }
  \*/
  export const vocabSchema = [
  body('word')
  .trim()
  .notEmpty().withMessage('Word is required')
  .isLength({ min: 1, max: 100 }).withMessage('Word must be 1-100 characters')
  .matches(/^[a-zA-Z\s'-]+$/)
  .withMessage('Word can only contain letters, spaces, hyphens, and apostrophes')
  .custom(word => {
  // Normalize: capitalize first letter
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }),

body('definition')
.trim()
.notEmpty().withMessage('Definition is required')
.isLength({ min: 5, max: 1000 })
.withMessage('Definition must be 5-1000 characters')
.custom(definition => {
// Check if definition starts with lowercase (should start with uppercase)
if (definition.length > 0 && definition[0] !== definition[0].toUpperCase()) {
throw new Error('Definition should start with an uppercase letter');
}
return true;
}),

body('example')
.optional({ nullable: true, checkFalsy: true })
.trim()
.isLength({ min: 5, max: 500 })
.withMessage('Example must be 5-500 characters')
.custom((example, { req }) => {
// Check if example contains the word
const word = req.body.word?.toLowerCase();
if (word && !example.toLowerCase().includes(word)) {
throw new Error('Example should contain the vocabulary word');
}
return true;
}),

body('pronunciation')
.optional({ nullable: true, checkFalsy: true })
.trim()
.matches(/^\/[^\/]+\/$/)
.withMessage('Pronunciation must be in IPA format: /.../ (e.g., /həˈloʊ/)')
.isLength({ max: 100 }).withMessage('Pronunciation too long'),

body('partOfSpeech')
.optional({ nullable: true, checkFalsy: true })
.trim()
.toLowerCase()
.isIn([
'noun',
'verb',
'adjective',
'adverb',
'pronoun',
'preposition',
'conjunction',
'interjection',
'determiner',
'phrase'
])
.withMessage('Invalid part of speech'),

body('difficulty')
.optional({ nullable: true })
.isInt({ min: 1, max: 5 })
.withMessage('Difficulty must be an integer between 1-5 (1=easiest, 5=hardest)')
.toInt(), // Convert string to integer

body('imageUrl')
.optional({ nullable: true, checkFalsy: true })
.trim()
.isURL({ protocols: ['http', 'https'], require_protocol: true })
.withMessage('Image URL must be a valid HTTP/HTTPS URL')
.isLength({ max: 500 }).withMessage('Image URL too long'),

body('audioUrl')
.optional({ nullable: true, checkFalsy: true })
.trim()
.isURL({ protocols: ['http', 'https'], require_protocol: true })
.withMessage('Audio URL must be a valid HTTP/HTTPS URL')
.isLength({ max: 500 }).withMessage('Audio URL too long'),

body('tags')
.optional()
.isArray().withMessage('Tags must be an array')
.custom(tags => {
if (tags.length > 10) {
throw new Error('Maximum 10 tags allowed per vocabulary');
}
// Check each tag is a valid UUID
tags.forEach(tagId => {
if (!isValidUUID(tagId)) {
throw new Error(`Invalid tag ID: ${tagId}`);
}
});
return true;
})
];

/\*\*

- Batch vocabulary import schema
- Validates: array of vocabularies
  \*/
  export const batchVocabSchema = [
  body('vocabularies')
  .isArray({ min: 1, max: 100 })
  .withMessage('Must provide 1-100 vocabularies for batch import'),

body('vocabularies.\*.word')
.trim()
.notEmpty().withMessage('Word is required for all items')
.isLength({ max: 100 }),

body('vocabularies.\*.definition')
.trim()
.notEmpty().withMessage('Definition is required for all items')
.isLength({ max: 1000 })
];

// ==========================================
// TAG VALIDATION SCHEMAS
// ==========================================

/\*\*

- Tag creation/update schema
- Validates: name, color
-
- @example
- Valid: { name: "IELTS", color: "#3B82F6" }
- Invalid: { name: "A", color: "red" }
  \*/
  export const tagSchema = [
  body('name')
  .trim()
  .notEmpty().withMessage('Tag name is required')
  .isLength({ min: 1, max: 30 })
  .withMessage('Tag name must be 1-30 characters')
  .matches(/^[a-zA-Z0-9\s\-_]+$/)
  .withMessage('Tag name can only contain letters, numbers, spaces, hyphens, and underscores')
  .custom(name => {
  // Normalize: uppercase
  return name.toUpperCase();
  }),

body('color')
.optional({ nullable: true, checkFalsy: true })
.trim()
.matches(/^#[0-9A-Fa-f]{6}$/)
.withMessage('Color must be a valid 6-digit hex code (e.g., #3B82F6)')
.custom(color => {
// Normalize: uppercase hex
return color.toUpperCase();
})
];

// ==========================================
// REVIEW VALIDATION SCHEMAS
// ==========================================

/\*\*

- Review quality validation
- Validates: quality rating (0-5)
-
- SM-2 Algorithm quality scale:
- 0 = Complete blackout
- 1 = Incorrect, but remembered on seeing answer
- 2 = Incorrect, but seemed easy on seeing answer
- 3 = Correct, but required significant difficulty
- 4 = Correct, with hesitation
- 5 = Perfect recall
-
- @example
- Valid: { quality: 4 }
- Invalid: { quality: 6 }
  \*/
  export const reviewSchema = [
  body('quality')
  .notEmpty().withMessage('Quality rating is required')
  .isInt({ min: 0, max: 5 })
  .withMessage('Quality must be an integer between 0-5 (0=forgot, 5=perfect recall)')
  .toInt(),

body('vocabularyId')
.notEmpty().withMessage('Vocabulary ID is required')
.custom(id => {
if (!isValidUUID(id)) {
throw new Error('Invalid vocabulary ID format');
}
return true;
})
];

/\*\*

- Batch review schema
- Validates: array of reviews
  \*/
  export const batchReviewSchema = [
  body('reviews')
  .isArray({ min: 1, max: 50 })
  .withMessage('Must provide 1-50 reviews for batch submission'),

body('reviews.\*.vocabularyId')
.notEmpty()
.custom(id => {
if (!isValidUUID(id)) {
throw new Error('Invalid vocabulary ID');
}
return true;
}),

body('reviews.\*.quality')
.isInt({ min: 0, max: 5 })
.toInt()
];

// ==========================================
// USER SETTINGS VALIDATION
// ==========================================

/\*\*

- User settings update schema
- Validates: theme, language, notification preferences, etc.
  \*/
  export const userSettingsSchema = [
  body('theme')
  .optional()
  .isIn(['light', 'dark', 'auto'])
  .withMessage('Theme must be one of: light, dark, auto'),

body('language')
.optional()
.isIn(['en', 'vi', 'fr', 'es', 'de', 'ja', 'ko', 'zh'])
.withMessage('Invalid language code'),

body('notifications.email')
.optional()
.isBoolean().withMessage('Email notifications must be boolean')
.toBoolean(),

body('notifications.push')
.optional()
.isBoolean().withMessage('Push notifications must be boolean')
.toBoolean(),

body('notifications.reviewReminder')
.optional()
.isBoolean().withMessage('Review reminder must be boolean')
.toBoolean(),

body('reviewSettings.cardsPerDay')
.optional()
.isInt({ min: 5, max: 100 })
.withMessage('Cards per day must be between 5-100')
.toInt(),

body('reviewSettings.showDefinitionFirst')
.optional()
.isBoolean().toBoolean(),

body('reviewSettings.autoPlayAudio')
.optional()
.isBoolean().toBoolean(),

body('reviewSettings.difficulty')
.optional()
.isIn(['easy', 'medium', 'hard'])
.withMessage('Difficulty must be: easy, medium, or hard'),

body('timezone')
.optional()
.isString()
.custom(tz => {
// Validate timezone format (e.g., "Asia/Ho*Chi_Minh")
if (!/^[A-Za-z]+\/[A-Za-z*]+$/.test(tz)) {
throw new Error('Invalid timezone format');
}
return true;
}),

body('dailyGoal')
.optional()
.isInt({ min: 1, max: 1000 })
.withMessage('Daily goal must be between 1-1000')
.toInt()
];

// ==========================================
// QUERY PARAMETER VALIDATION
// ==========================================

/\*\*

- Pagination query validation
- Validates: page, limit for GET endpoints
-
- @example
- GET /api/vocab?page=2&limit=20
  \*/
  export const paginationSchema = [
  query('page')
  .optional()
  .isInt({ min: 1 })
  .withMessage('Page must be a positive integer')
  .toInt()
  .default(1),

query('limit')
.optional()
.isInt({ min: 1, max: 100 })
.withMessage('Limit must be between 1-100')
.toInt()
.default(20),

query('sortBy')
.optional()
.isIn(['createdAt', 'updatedAt', 'word', 'difficulty'])
.withMessage('Invalid sort field'),

query('sortOrder')
.optional()
.isIn(['asc', 'desc'])
.withMessage('Sort order must be asc or desc')
.default('desc')
];

/\*\*

- Search query validation
- Validates: search term
  \*/
  export const searchSchema = [
  query('q')
  .optional()
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage('Search query must be 1-100 characters')
  .custom(q => {
  // Sanitize search query
  return q.replace(/[<>]/g, '');
  })
  ];

/\*\*

- Date range query validation
- Validates: startDate, endDate
  \*/
  export const dateRangeSchema = [
  query('startDate')
  .optional()
  .isISO8601().withMessage('Start date must be in ISO 8601 format')
  .toDate(),

query('endDate')
.optional()
.isISO8601().withMessage('End date must be in ISO 8601 format')
.toDate()
.custom((endDate, { req }) => {
if (req.query.startDate && endDate < new Date(req.query.startDate)) {
throw new Error('End date must be after start date');
}
return true;
})
];

// ==========================================
// URL PARAMETER VALIDATION
// ==========================================

/\*\*

- UUID parameter validation
- Validates: id parameter in URL
-
- @example
- GET /api/vocab/:id
  \*/
  export const uuidParamSchema = [
  param('id')
  .notEmpty().withMessage('ID is required')
  .custom(id => {
  if (!isValidUUID(id)) {
  throw new Error('Invalid UUID format');
  }
  return true;
  })
  ];

/\*\*

- Multiple UUID parameters validation
  \*/
  export const multipleUuidSchema = [
  param('id').custom(id => {
  if (!isValidUUID(id)) {
  throw new Error('Invalid UUID format');
  }
  return true;
  }),

param('vocabularyId')
.optional()
.custom(id => {
if (!isValidUUID(id)) {
throw new Error('Invalid vocabulary ID format');
}
return true;
}),

param('tagId')
.optional()
.custom(id => {
if (!isValidUUID(id)) {
throw new Error('Invalid tag ID format');
}
return true;
})
];

// ==========================================
// FILE UPLOAD VALIDATION
// ==========================================

/\*\*

- CSV file upload validation
- Validates: file type, size
  \*/
  export const csvUploadSchema = [
  body('file')
  .custom((value, { req }) => {
  if (!req.file) {
  throw new Error('CSV file is required');
  }

        // Check file type
        const allowedMimes = ['text/csv', 'application/vnd.ms-excel'];
        if (!allowedMimes.includes(req.file.mimetype)) {
          throw new Error('File must be CSV format');
        }

        // Check file size (max 5MB)
        if (req.file.size > 5 * 1024 * 1024) {
          throw new Error('File size must not exceed 5MB');
        }

        return true;
      })

  ];

/\*\*

- Image upload validation
- Validates: image type, size
  \*/
  export const imageUploadSchema = [
  body('image')
  .custom((value, { req }) => {
  if (!req.file) {
  return true; // Optional
  }

        // Check file type
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimes.includes(req.file.mimetype)) {
          throw new Error('Image must be JPEG, PNG, WebP, or GIF');
        }

        // Check file size (max 2MB)
        if (req.file.size > 2 * 1024 * 1024) {
          throw new Error('Image size must not exceed 2MB');
        }

        // Check dimensions (optional, requires image processing library)
        // if (req.file.width > 2000 || req.file.height > 2000) {
        //   throw new Error('Image dimensions must not exceed 2000x2000');
        // }

        return true;
      })

  ];

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/\*\*

- Sanitize user input to prevent XSS attacks
- Escapes HTML special characters
-
- @param {string} input - Raw user input
- @returns {string} Sanitized string safe for HTML
-
- @example
- Input: '<script>alert("XSS")</script>'
- Output: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
  \*/
  export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
  return input;
  }

const htmlEscapeMap = {
'&': '&amp;',
'<': '&lt;',
'>': '&gt;',
'"': '&quot;',
"'": '&#x27;',
'/': '&#x2F;'
};

return input.replace(/[&<>"'/]/g, char => htmlEscapeMap[char]);
};

/\*\*

- Validate UUID format (v4)
-
- @param {string} uuid - UUID string to validate
- @returns {boolean} True if valid UUID v4
-
- @example
- Valid: '550e8400-e29b-41d4-a716-446655440000'
- Invalid: '550e8400-e29b-41d4-a716-44665544000' (missing digit)
- Invalid: 'not-a-uuid'
-
- UUID v4 format:
- xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
- where:
- - x = any hexadecimal digit (0-9, a-f)
- - y = one of 8, 9, a, or b (variant bits)
- - 4 = version number (always 4 for UUID v4)
    \*/
    export const isValidUUID = (uuid) => {
    if (typeof uuid !== 'string') {
    return false;
    }

// UUID v4 regex pattern
const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

return uuidV4Regex.test(uuid);
};

/\*\*

- Validate email format (comprehensive check)
-
- @param {string} email - Email address to validate
- @returns {boolean} True if valid email
-
- @example
- Valid: 'user@example.com', 'john.doe+tag@company.co.uk'
- Invalid: 'invalid', '@example.com', 'user@', 'user @example.com'
  \*/
  export const isValidEmail = (email) => {
  if (typeof email !== 'string') {
  return false;
  }

// Comprehensive email regex
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)\*$/;

return emailRegex.test(email) && email.length <= 255;
};

/\*\*

- Validate strong password
-
- Requirements:
- - Min 8 characters
- - At least 1 lowercase letter
- - At least 1 uppercase letter
- - At least 1 digit
- - At least 1 special character (optional)
-
- @param {string} password - Password to validate
- @param {boolean} requireSpecial - Require special character
- @returns {Object} { valid: boolean, errors: string[] }
  \*/
  export const isStrongPassword = (password, requireSpecial = false) => {
  const errors = [];

if (typeof password !== 'string') {
return { valid: false, errors: ['Password must be a string'] };
}

if (password.length < 8) {
errors.push('Password must be at least 8 characters');
}

if (password.length > 128) {
errors.push('Password must not exceed 128 characters');
}

if (!/[a-z]/.test(password)) {
errors.push('Password must contain at least one lowercase letter');
}

if (!/[A-Z]/.test(password)) {
errors.push('Password must contain at least one uppercase letter');
}

if (!/\d/.test(password)) {
errors.push('Password must contain at least one number');
}

if (requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
errors.push('Password must contain at least one special character');
}

// Check for common weak passwords
const weakPasswords = [
'password', 'password123', '12345678', 'qwerty123',
'admin123', 'letmein', 'welcome123'
];

if (weakPasswords.includes(password.toLowerCase())) {
errors.push('Password is too common');
}

return {
valid: errors.length === 0,
errors
};
};

/\*\*

- Normalize string for comparison
- - Trim whitespace
- - Convert to lowercase
- - Remove extra spaces
-
- @param {string} str - String to normalize
- @returns {string} Normalized string
  \*/
  export const normalizeString = (str) => {
  if (typeof str !== 'string') {
  return '';
  }

return str
.trim()
.toLowerCase()
.replace(/\s+/g, ' '); // Replace multiple spaces with single space
};

/\*\*

- Validate hex color code
-
- @param {string} color - Hex color code (e.g., '#3B82F6')
- @returns {boolean} True if valid hex color
-
- @example
- Valid: '#3B82F6', '#fff', '#FFFFFF'
- Invalid: 'red', '3B82F6', '#GGG'
  \*/
  export const isValidHexColor = (color) => {
  if (typeof color !== 'string') {
  return false;
  }

// 3-digit or 6-digit hex color
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

return hexColorRegex.test(color);
};

/\*\*

- Validate URL format
-
- @param {string} url - URL to validate
- @param {Object} options - Validation options
- @returns {boolean} True if valid URL
  \*/
  export const isValidURL = (url, options = {}) => {
  const {
  protocols = ['http', 'https'],
  requireProtocol = true
  } = options;

if (typeof url !== 'string') {
return false;
}

try {
const urlObj = new URL(url);

    if (requireProtocol && !protocols.includes(urlObj.protocol.replace(':', ''))) {
      return false;
    }

    return true;

} catch (error) {
return false;
}
};

/\*\*

- Validate ISO 8601 date format
-
- @param {string} date - Date string to validate
- @returns {boolean} True if valid ISO 8601 date
-
- @example
- Valid: '2025-11-08T10:30:00.000Z', '2025-11-08'
- Invalid: '08/11/2025', '2025-13-01' (invalid month)
  \*/
  export const isValidISODate = (date) => {
  if (typeof date !== 'string') {
  return false;
  }

const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

if (!isoDateRegex.test(date)) {
return false;
}

const parsedDate = new Date(date);
return !isNaN(parsedDate.getTime());
};

// ==========================================
// CUSTOM VALIDATORS (Advanced)
// ==========================================

/\*\*

- Custom validator: Check if value exists in database
- Use with express-validator's .custom() method
-
- @example
- body('email')
- .custom(async (email, { req }) => {
-     const prisma = req.app.get('prisma');
-     const exists = await checkExists(prisma, 'user', 'email', email);
-     if (exists) {
-       throw new Error('Email already registered');
-     }
-     return true;
- })
  \*/
  export const checkExists = async (prisma, model, field, value) => {
  try {
  const record = await prisma[model].findFirst({
  where: { [field]: value },
  select: { id: true }
  });
  return !!record;
  } catch (error) {
  console.error('Database check error:', error);
  return false;
  }
  };

/\*\*

- Custom validator: Check if user owns resource
-
- @example
- param('id')
- .custom(async (id, { req }) => {
-     const prisma = req.app.get('prisma');
-     const owns = await checkOwnership(
-       prisma,
-       'vocabulary',
-       id,
-       req.user.id
-     );
-     if (!owns) {
-       throw new Error('You do not own this resource');
-     }
-     return true;
- })
  \*/
  export const checkOwnership = async (prisma, model, resourceId, userId) => {
  try {
  const record = await prisma[model].findFirst({
  where: {
  id: resourceId,
  userId
  },
  select: { id: true }
  });
  return !!record;
  } catch (error) {
  console.error('Ownership check error:', error);
  return false;
  }
  };

/\*\*

- Rate limit validator
- Check if user exceeded action limit
-
- @example
- Check if user created > 100 vocabs today
  \*/
  export const checkRateLimit = async (prisma, userId, action, limit, windowMs) => {
  const since = new Date(Date.now() - windowMs);

try {
const count = await prisma.apiUsage.count({
where: {
endpoint: action,
userId,
createdAt: { gte: since }
}
});

    return count < limit;

} catch (error) {
console.error('Rate limit check error:', error);
return true; // Allow on error
}
};

// ==========================================
// EXPORT ALL SCHEMAS
// ==========================================

export default {
// Middleware
validate,

// Authentication
registerSchema,
loginSchema,
passwordResetRequestSchema,
passwordResetSchema,
changePasswordSchema,

// Vocabulary
vocabSchema,
batchVocabSchema,

// Tags
tagSchema,

// Reviews
reviewSchema,
batchReviewSchema,

// User Settings
userSettingsSchema,

// Query Parameters
paginationSchema,
searchSchema,
dateRangeSchema,

// URL Parameters
uuidParamSchema,
multipleUuidSchema,

// File Uploads
csvUploadSchema,
imageUploadSchema,

// Utility Functions
sanitizeInput,
isValidUUID,
isValidEmail,
isStrongPassword,
normalizeString,
isValidHexColor,
isValidURL,
isValidISODate,
checkExists,
checkOwnership,
checkRateLimit
};
