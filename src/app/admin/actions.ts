'use server';

import { cookies } from 'next/headers';

/**
 * Log in the admin by verifying the password and setting an HTTP-only session cookie.
 * This is temporary and will be replaced by a proper auth system in a later phase.
 */
export async function loginAdmin(password: string): Promise<{ success: boolean; error?: string }> {
  const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (password === expectedPassword) {
    const cookieStore = await cookies();
    cookieStore.set('admin_session', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return { success: true };
  }

  return { success: false, error: 'Incorrect admin password' };
}

/**
 * Log out the admin by deleting the session cookie.
 */
export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
}
