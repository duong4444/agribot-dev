import { redirect } from 'next/navigation';

export default function FarmPage() {
  // Redirect to overview as default
  redirect('/farm/overview');
}