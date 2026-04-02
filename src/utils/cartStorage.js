import { apiGet, apiPost } from "./api";

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

export async function syncCartWithBackend() {
  const { userId } = getActiveUserIdentity();
  if (userId === 'guest') return;

  const localItems = readCartItems();
  try {
    const backendItems = await apiGet('cart');
    
    // Merge or prioritize backend? 
    // Usually backend is safer, but local might have newly added items.
    // For simplicity, let's say if we have backend items, we merge.
    // But actually, the best way is to ALWAYS sync when adding/removing locally.
    
    if (backendItems && backendItems.length > 0 && localItems.length === 0) {
      writeCartItems(backendItems);
      return backendItems;
    } else if (localItems.length > 0) {
      await apiPost('cart', { items: localItems });
    }
    return localItems;
  } catch (error) {
    console.warn("Cart sync failed:", error);
    return localItems;
  }
}

export async function pushCartToBackend(items) {
  const { userId } = getActiveUserIdentity();
  if (userId === 'guest') return;
  
  try {
    await apiPost('cart', { items });
  } catch (err) {
    console.warn("Failed to push cart to backend", err);
  }
}
