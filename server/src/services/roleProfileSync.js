import User, { normalizeUserRoles } from '../models/User.js';
import Farmer from '../models/Farmer.js';
import Admin from '../models/Admin.js';

function buildRoleProfile(user) {
  return {
    userId: user._id,
    name: user.name,
    email: user.email,
    status: user.status,
    profile: {
      country: user.profile?.country || '',
      state: user.profile?.state || '',
      district: user.profile?.district || '',
      mandal: user.profile?.mandal || '',
      doorNo: user.profile?.doorNo || '',
      pincode: user.profile?.pincode || '',
      locationText: user.profile?.locationText || '',
      coordinates: user.profile?.coordinates || undefined,
      phone: user.profile?.phone || '',
      avatarUrl: user.profile?.avatarUrl || '',
    },
  };
}

export async function syncRoleProfileFromUser(user) {
  if (!user) return;

  const roles = normalizeUserRoles(user).roles;

  const payload = buildRoleProfile(user);

  if (roles.includes('farmer')) {
    await Farmer.findOneAndUpdate(
      { userId: user._id },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } else {
    await Farmer.deleteOne({ userId: user._id });
  }

  if (roles.includes('admin')) {
    await Admin.findOneAndUpdate(
      { userId: user._id },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } else {
    await Admin.deleteOne({ userId: user._id });
  }
}

export async function syncRoleProfileByUserId(userId) {
  const user = await User.findById(userId);
  if (!user) return;
  await syncRoleProfileFromUser(user);
}

export async function removeRoleProfilesByUserId(userId) {
  await Promise.all([
    Farmer.deleteOne({ userId }),
    Admin.deleteOne({ userId }),
  ]);
}
