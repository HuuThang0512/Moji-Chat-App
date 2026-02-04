import { BrowserRouter,Routes,Route } from "react-router-dom";
import { Toaster } from "sonner";

import ChatAppPage from "./pages/ChatAppPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useThemeStore } from "./stores/useThemeStore";
import { useEffect } from "react";
import { useSocketStore } from "./stores/useSocketStore";
import { useAuthStore } from "./stores/useAuthStore";

function App() {
  const { isDark,setTheme } = useThemeStore();
  const { accessToken } = useAuthStore();
  const { connectSocket,disconnectSocket } = useSocketStore();

  // Theme
  useEffect(() => {
    setTheme(isDark);
  },[isDark]);

  // Socket
  useEffect(() => {
    if(accessToken) {
      connectSocket();
    } 
    return () => disconnectSocket();
  },[accessToken]);
  return (
    <>
      <Toaster richColors />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */ }
          <Route path="/signup" element={ <SignUpPage /> } />
          <Route path="/signin" element={ <SignInPage /> } />

          {/* Protected Routes */ }
          <Route element={ <ProtectedRoute /> }>
            <Route path="/" element={ <ChatAppPage /> } />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
