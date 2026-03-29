function getActiveUserIdentity() {
  try {
    const rawUser = localStorage.getItem('registeredUser');
    const role = localStorage.getItem('userRole') || 'guest';
    if (!rawUser) return { userId: 'guest', role };

    const user = JSON.parse(rawUser);
    const userId = user?.id || user?._id || 'guest';
    return { userId: String(userId), role: String(role) };
  } catch (error) {
    return { userId: 'guest', role: 'guest' };
  }
}

export function getScopedCartKey() {
  const { userId, role } = getActiveUserIdentity();
  return `cartItems:${userId}:${role}`;
}

export function readCartItems() {
  try {
    const raw = localStorage.getItem(getScopedCartKey());
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

export function writeCartItems(items) {
  localStorage.setItem(getScopedCartKey(), JSON.stringify(items || []));
}

export function clearCartItems() {
  localStorage.removeItem(getScopedCartKey());
}
