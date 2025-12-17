import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.assign('/');
  };

  if (!email) return null;

  return (
    <div id="user-menu" className="fixed top-3 right-3 flex items-center gap-3 bg-white/80 backdrop-blur px-3 py-2 rounded-xl shadow">
      <span className="text-sm text-gray-700">{email}</span>
      <button onClick={signOut} className="text-sm underline">Sign out</button>
    </div>
  );
}