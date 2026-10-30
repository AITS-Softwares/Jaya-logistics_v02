"use client";

import { useRouter } from "next/navigation";
import { disablePushSubscription } from '@/lib/pushClient';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    setBusy(true);
    try { await disablePushSubscription(); }
    catch { setError('Unable to turn off device notifications. Please retry logout.'); setBusy(false); return; }
    sessionStorage.removeItem('erp:notification-id');
    // ✅ Token aur user dono clear karo
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    ['groupToken', 'lastPath', 'lastPathOwner'].forEach(key => localStorage.removeItem(key));
    router.push("/signin");
  };

  return (
    <div><button
      onClick={handleLogout}
      disabled={busy}
      className="w-full py-2.5 px-4 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 rounded-lg text-sm font-semibold transition-all border border-red-600/20"
    >
      {busy ? 'Signing out...' : 'Logout'}
    </button>{error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}</div>
  );
}


// "use client";

// import { useEffect, useState } from 'react';
// import axios from 'axios';

// const LogoutButton = () => {
//   const [isMounted, setIsMounted] = useState(false); // Ensure the component is mounted

//   // Set the state to true once the component has mounted on the client
//   useEffect(() => {
//     setIsMounted(true);
//   }, []);

//   // Handle logout logic
//   const handleLogout = async () => {
//     try {
//       const response = await axios.post('/api/logout');

//       localStorage.removeItem('token');

//       if (response.status === 200) {
//         // Redirect to login page after successful logout
//         window.location.href = '/';
//       } else {
//         console.error('Logout failed');
//       }
//     } catch (error) {
//       console.error('Error logging out:', error);
//     }
//   };

//   // Ensure that the component renders only on the client side
//   if (!isMounted) {
//     return null; // Don't render anything during server-side rendering
//   }

//   return (
//     <button onClick={handleLogout} className="logout-button">
//       Logout
//     </button>
//   );
// };

// export default LogoutButton;
