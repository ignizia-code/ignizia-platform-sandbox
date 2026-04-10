import { redirect } from 'next/navigation';

export default function Page() {
  // Redirect legacy governance route into LivingOps -> Strategy Studio
  redirect('/dashboard/portal?app=strategy-studio');
}
