const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

// Generate JWT token
function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {
    expiresIn: '1h', // Token expires in 1 hour
  });
}

// Verify JWT token
function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY);
}

// Hash password
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare password
async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

module.exports = { generateToken, verifyToken, hashPassword, comparePassword };