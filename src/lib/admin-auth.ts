import { cookies } from 'next/headers';

/**
 * Checks if the user is authenticated as an admin by comparing the session cookie
 * to the ADMIN_PASSWORD environment variable.
 * Note: This simple password gate is a temporary solution for this phase and will 
 * be replaced with a robust authentication system (e.g. Supabase Auth) in a later phase.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get('admin_session')?.value;
  const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
  return sessionValue === expectedPassword;
}
