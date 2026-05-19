export function saveUser(name: string, email: string, password?: string) {
  const usersStr = localStorage.getItem('mockUsers') || '[]';
  const users = JSON.parse(usersStr);
  
  const existingUser = users.find((u: any) => u.email === email);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const newUser = { id: Date.now().toString(), name, email, password };
  users.push(newUser);
  localStorage.setItem('mockUsers', JSON.stringify(users));
  
  // Auto-login after signup
  localStorage.setItem('currentUser', JSON.stringify(newUser));
  return newUser;
}

export function loginUser(email: string, password?: string) {
  const usersStr = localStorage.getItem('mockUsers') || '[]';
  const users = JSON.parse(usersStr);
  const user = users.find((u: any) => u.email === email && (!password || u.password === password));
  
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  }
  return null;
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('currentUser');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

export function logoutUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentUser');
  }
}

export function isAuthenticated() {
  return !!getCurrentUser();
}
