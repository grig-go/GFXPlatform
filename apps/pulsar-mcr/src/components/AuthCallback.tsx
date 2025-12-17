import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN') {
        // Redirect to the main app
        window.location.href = '/';
      }
    });
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      Completing sign in...
    </div>
  );
};

export default AuthCallback;