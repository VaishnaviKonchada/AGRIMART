import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User, { normalizeRoleName, normalizeUserRoles } from '../models/User.js';
import { syncRoleProfileFromUser } from '../services/roleProfileSync.js';
import { sendRegistrationEmail, sendLoginEmail, sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();

const sanitizeCoordinates = (coords) => {
  if (!coords) return undefined;

  if (typeof coords === 'string') {
    const text = coords.trim().toLowerCase();
    if (!text || text === 'undefined' || text === 'null') return undefined;
    try {
      const parsed = JSON.parse(coords);
      return sanitizeCoordinates(parsed);
    } catch {
      return undefined;
    }
  }

  if (typeof coords !== 'object') return undefined;

  const lat = Number(coords.lat);
  const lng = Number(coords.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

  return { lat, lng };
};

router.post('/register', async (req, res) => {
  try {
    console.log('📝 Register request received:', { name: req.body.name, email: req.body.email, role: req.body.role });
    const {
      name,
      email,
      password,
      role,
      phone,
      country,
      state,
      district,
      mandal,
      doorNo,
      pincode,
      locationText,
      coordinates,
    } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedInputRole = normalizeRoleName(role);

    let normalizedPhone = String(phone || '').replace(/\D/g, '');
    if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) {
      normalizedPhone = normalizedPhone.slice(2);
    }
    if (normalizedPhone.length === 11 && normalizedPhone.startsWith('0')) {
      normalizedPhone = normalizedPhone.slice(1);
    }
    
    // Validation
    if (!name || !normalizedEmail || !password || !role) {
      console.log('❌ Validation failed: missing required fields');
      return res.status(400).json({ 
        message: 'Missing required fields: name, email, password, role' 
      });
    }

    if (!country || !state || !district || !mandal || !pincode || !locationText) {
      console.log('❌ Validation failed: missing location fields');
      return res.status(400).json({
        message: 'Missing required location fields: country, state, district, mandal, pincode, locationText'
      });
    }

    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({ message: 'Please provide a valid Indian mobile number (+91 9XXXXXXXXX)' });
    }
    
    // Validate role
    const validRoles = ['customer', 'farmer', 'dealer', 'admin'];
    if (!validRoles.includes(normalizedInputRole)) {
      console.log('❌ Validation failed: invalid role:', role);
      return res.status(400).json({ 
        message: 'Invalid role. Must be one of: customer, farmer, dealer, admin' 
      });
    }
    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin self-registration is restricted.' });
    }
    
    // Check if email already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      const passwordOk = existing.passwordHash && await bcrypt.compare(password, existing.passwordHash);
      if (!passwordOk) {
        console.log('❌ Existing email used with incorrect password:', normalizedEmail);
        return res.status(409).json({ message: 'Email already registered. Use the same password to add a new role, or login.' });
      }

      const existingRoles = Array.isArray(existing.roles) && existing.roles.length
        ? existing.roles
        : [existing.role].filter(Boolean);

      if (existingRoles.includes(normalizedInputRole)) {
        console.log('❌ Role already exists for email:', normalizedEmail, role);
        return res.status(409).json({ message: `This email is already registered as ${normalizedInputRole}. Please login.` });
      }

      const nextRoles = Array.from(new Set([...existingRoles, normalizedInputRole]));
      existing.roles = nextRoles;
      existing.role = normalizedInputRole;
      existing.profile = {
        ...(existing.profile || {}),
        phone: `+91${normalizedPhone}`,
        coordinates: sanitizeCoordinates(existing.profile?.coordinates),
      };
      await existing.save();

      let roleSyncWarning = null;
      try {
        await syncRoleProfileFromUser(existing);
      } catch (syncErr) {
        console.error('❌ Failed to sync role profile during role add:', syncErr.message);
        roleSyncWarning = syncErr.message;
      }

      sendRegistrationEmail(normalizedEmail, existing.name, normalizedInputRole).catch(err => {
        console.error('❌ Failed to send role-add email:', err.message);
      });

      return res.status(200).json({
        message: roleSyncWarning
          ? `Role ${normalizedInputRole} added successfully for this email. Please login and select that role. Profile sync will retry automatically.`
          : `Role ${normalizedInputRole} added successfully for this email. Please login and select that role.`,
        warning: roleSyncWarning,
        user: {
          id: existing._id,
          name: existing.name,
          email: existing.email,
          role: existing.role,
          roles: existing.roles,
          profile: existing.profile,
        }
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await User.create({ 
      name, 
      email: normalizedEmail,
      passwordHash, 
      role: normalizedInputRole,
      roles: [normalizedInputRole],
      status: 'active',
      profile: {
        phone: `+91${normalizedPhone}`,
        country,
        state,
        district,
        mandal,
        doorNo: doorNo || '',
        pincode,
        locationText,
        coordinates: sanitizeCoordinates(coordinates),
      }
    });

    // Keep role-specific collections in sync at registration time.
    let profileSyncWarning = null;
    try {
      await syncRoleProfileFromUser(user);
    } catch (syncErr) {
      console.error('❌ Failed to sync role profile during register:', syncErr.message);
      profileSyncWarning = syncErr.message;
    }
    
    console.log('✅ User created successfully:', user._id);
    
    // Send registration email asynchronously (don't wait for it)
    sendRegistrationEmail(normalizedEmail, name, normalizedInputRole).catch(err => {
      console.error('❌ Failed to send registration email:', err.message);
    });
    
    return res.status(201).json({ 
      message: profileSyncWarning
        ? 'User registered successfully. Confirmation email sent. Profile sync will retry automatically.'
        : 'User registered successfully. Confirmation email sent.',
      warning: profileSyncWarning,
      user: {
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        roles: user.roles,
        profile: user.profile,
      }
    });
  } catch (e) {
    console.error('❌ Registration error:', e.message, e.stack);
    return res.status(500).json({ message: 'Server error during registration', error: e.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'If the email exists, a reset link was sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

    user.passwordReset = { tokenHash, expiresAt };
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    sendPasswordResetEmail(email, user.name, resetLink).catch(err => {
      console.error('❌ Failed to send password reset email:', err.message);
    });

    return res.json({ message: 'If the email exists, a reset link was sent.' });
  } catch (e) {
    console.error('❌ Forgot password error:', e.message, e.stack);
    return res.status(500).json({ message: 'Server error during password reset request', error: e.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'Email, token, and newPassword are required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ email, 'passwordReset.tokenHash': tokenHash });
    if (!user || !user.passwordReset?.expiresAt || user.passwordReset.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Reset token is invalid or expired' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    user.passwordReset = { tokenHash: null, expiresAt: null };
    await user.save();

    return res.json({ message: 'Password reset successful. Please login.' });
  } catch (e) {
    console.error('❌ Reset password error:', e.message, e.stack);
    return res.status(500).json({ message: 'Server error during password reset', error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login request received:', { email: req.body.email });
    const { email, password, role } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedRole = normalizeRoleName(role);
    
    // Validation
    if (!normalizedEmail || !password) {
      console.log('❌ Login validation failed: missing email or password');
      return res.status(400).json({ message: 'Email and password required' });
    }
    
    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log('❌ Login failed: user not found:', normalizedEmail);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Ensure password hash exists (protect against legacy users without password)
    if (!user.passwordHash) {
      console.log('❌ Login failed: no password hash for user:', normalizedEmail);
      return res.status(401).json({ message: 'Password not set for this account. Please register again.' });
    }
    
    // Check user status
    if (user.status === 'blocked') {
      console.log('❌ Login failed: account blocked:', normalizedEmail);
      return res.status(403).json({ message: 'Your account has been blocked' });
    }
    
    if (user.status === 'suspended') {
      console.log('❌ Login failed: account suspended:', normalizedEmail);
      return res.status(403).json({ message: 'Your account has been suspended' });
    }
    
    // Verify password
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      console.log('❌ Login failed: invalid password for:', normalizedEmail);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const normalized = normalizeUserRoles(user);
    const roles = normalized.roles;
    const effectiveRole = normalizeRoleName(normalizedRole || normalized.primaryRole);

    if (effectiveRole && !roles.includes(effectiveRole)) {
      return res.status(403).json({ message: `This email is not registered as ${effectiveRole}. Registered roles: ${roles.join(', ')}` });
    }

    // Self-heal legacy users where role and roles drifted over time.
    if (JSON.stringify(user.roles || []) !== JSON.stringify(roles)) {
      user.roles = roles;
    }

    if (effectiveRole && user.role !== effectiveRole) {
      user.role = effectiveRole;
      await user.save();
    } else if (user.isModified('roles')) {
      await user.save();
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { sub: user._id.toString(), role: effectiveRole || user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    console.log('✅ Login successful for:', normalizedEmail, 'Token:', token.substring(0, 20) + '...');

    // Self-heal role-specific collections for existing users.
    try {
      await syncRoleProfileFromUser(user);
    } catch (syncErr) {
      console.error('⚠️ Role profile sync on login failed:', syncErr.message);
    }
    
    // Send login email asynchronously (don't wait for it)
    sendLoginEmail(normalizedEmail, user.name, effectiveRole || user.role).catch(err => {
      console.error('❌ Failed to send login email:', err.message);
    });
    
    return res.json({ 
      message: 'Login successful',
      accessToken: token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: effectiveRole || user.role,
        roles: roles,
      } 
    });
  } catch (e) {
    console.error('❌ Login error:', e.message, e.stack);
    return res.status(500).json({ 
      message: 'Server error during login', 
      error: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined 
    });
  }
});

export default router;
