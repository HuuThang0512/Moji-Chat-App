import Logout from "@/components/auth/Logout";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";
import React from "react";
import { toast } from "sonner";

const ChatAppPage = () => {
  const user = useAuthStore((state) => state.user);
  const handleOnClickTest = async () => {
    try {
      await api.get("/users/test");
      toast.success("Test successful");
    } catch (error) {
      toast.error("Failed to test");
    }
  }
  return (
    <div>
      {user && <div>Welcome {user.displayName}</div>}
      <Logout />
      <Button onClick={handleOnClickTest}>Test</Button>
    </div>
  );
};

export default ChatAppPage;
