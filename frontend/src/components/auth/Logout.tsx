import { useAuthStore } from '@/stores/useAuthStore';
import React from 'react'
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { LogOut } from 'lucide-react';

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
    <Button variant="completeGhost" onClick={handleLogout}><LogOut className="text-destructive" /> Log out</Button>
  )
}

export default Logout;