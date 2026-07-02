import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import AdminLoginClient from './AdminLoginClient';

export const revalidate = 0;

export default async function AdminLoginPage() {
  const isAuth = await isAdminAuthenticated();
  
  if (isAuth) {
    redirect('/admin/orders');
  }

  return <AdminLoginClient />;
}
