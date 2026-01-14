import { useAuthStore } from "@/stores/useAuthStore";
import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const { accessToken, user, loading, refresh, fetchMe } = useAuthStore();
  const [starting, setStarting] = useState(true);
  const init = async () => {
    if (!accessToken) {
      await refresh();
    }

    if (accessToken && !user) {
      await fetchMe();
    }
    setStarting(false);
  };
  useEffect(() => {
    init();
  }, []);

  if (starting || loading) {
    return (
      <div className="flex items-center justify-center gap-2">
        <div className="w-10 h-10 border-t-transparent border-b-transparent border-r-transparent border-l-transparent border-2 border-primary rounded-full animate-spin"></div>
        <span className="text-sm text-muted-foreground">... Loading</span>
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
