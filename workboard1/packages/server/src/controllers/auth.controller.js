import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/env.js';
import logger from '../config/logger.js';
import { ROLES } from '@workboard/shared';

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    config.jwtAccessSecret,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { id: userId },
    config.jwtRefreshSecret,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

export const register = async (req, res) => {
  try {
    const { email, name, password, role = ROLES.EMPLOYEE } = req.body;

    // Validate required fields
    if (!email || !name || !password) {
      return res.status(400).json({
        error: 'Email, name, and password are required'
      });
    }

    // Validate role
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        error: 'Invalid role specified'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists with this email'
      });
    }

    // Hash password and create user
    const passwordHash = await User.hashPassword(password);
    const user = new User({
      email,
      name,
      role,
      passwordHash
    });

    await user.save();

    logger.info('User registered:', { userId: user._id, email, role });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    logger.info('User logged in:', { userId: user._id, email });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        leaveBalance: user.leaveBalance
      },
      tokens: {
        access: accessToken,
        refresh: refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};