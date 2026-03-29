import mongoose from 'mongoose';

const VALID_ROLES = ['admin', 'farmer', 'customer', 'dealer'];

export function normalizeRoleName(role) {
  const raw = String(role || '').trim().toLowerCase();
  if (raw === 'transport dealer') return 'dealer';
  return VALID_ROLES.includes(raw) ? raw : '';
}

export function normalizeUserRoles(userLike = {}) {
  const merged = [
    ...(Array.isArray(userLike.roles) ? userLike.roles : []),
    userLike.role,
  ]
    .map(normalizeRoleName)
    .filter(Boolean);

  let roles = Array.from(new Set(merged));
  if (!roles.length) roles = ['customer'];

  let primaryRole = normalizeRoleName(userLike.role);
  if (!primaryRole) primaryRole = roles[0];
  if (!roles.includes(primaryRole)) roles = Array.from(new Set([primaryRole, ...roles]));

  return { primaryRole, roles };
}

function normalizeCoordinates(coords) {
  if (!coords) return undefined;

  if (typeof coords === 'string') {
    const text = coords.trim().toLowerCase();
    if (!text || text === 'undefined' || text === 'null') return undefined;
    try {
      const parsed = JSON.parse(coords);
      return normalizeCoordinates(parsed);
    } catch {
      return undefined;
    }
  }

  if (typeof coords !== 'object') return undefined;

  const lat = Number(coords.lat);
  const lng = Number(coords.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

  return { lat, lng };
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'farmer', 'customer', 'dealer'], default: 'customer' },
    roles: {
      type: [{ type: String, enum: ['admin', 'farmer', 'customer', 'dealer'] }],
      default: ['customer'],
    },
    status: { type: String, enum: ['active', 'blocked', 'suspended', 'pending'], default: 'active' },
    profile: {
      country: String,
      state: String,
      district: String,
      mandal: String,
      doorNo: String,
      pincode: String,
      locationText: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
      phone: String,
      avatarUrl: String,
    },
    passwordReset: {
      tokenHash: String,
      expiresAt: Date,
    },
  },
  { timestamps: true }
);

userSchema.pre('validate', function normalizeRolesBeforeValidate(next) {
  const normalized = normalizeUserRoles(this);
  this.role = normalized.primaryRole;
  this.roles = normalized.roles;

  if (this.profile && typeof this.profile === 'object') {
    this.profile.coordinates = normalizeCoordinates(this.profile.coordinates);
  }

  next();
});

export default mongoose.model('User', userSchema);
