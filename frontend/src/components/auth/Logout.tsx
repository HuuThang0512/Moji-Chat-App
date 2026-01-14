import { useAuthStore } from '@/stores/useAuthStore';
import React from 'react'
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';

const Logout = () => {
    const { signOut } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        const success = await signOut();
        if (success) {
            navigate("/signin");
        }
    }
  return (
    <Button onClick={handleLogout}>Logout</Button>
  )
}

export default Logout;