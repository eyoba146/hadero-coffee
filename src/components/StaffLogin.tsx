import React, { useState } from "react";
import { Lock, User, Eye, EyeOff, AlertTriangle, Coffee, Sparkles, KeyRound } from "lucide-react";

interface StaffLoginProps {
  onLoginSuccess: (user: { id: string; username: string; role: "admin" | "waiter"; fullName: string }) => void;
  onCancel: () => void;
}

export default function StaffLogin({ onLoginSuccess, onCancel }: StaffLoginProps) {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e?: React.FormEvent, customCredentials?: { u: string; p: string; isQuick?: boolean }) => {
    if (e) e.preventDefault();
    const targetUser = customCredentials ? customCredentials.u : username;
    const targetPass = customCredentials ? customCredentials.p : password;
    const isQuick = customCredentials ? !!customCredentials.isQuick : false;

    if (!targetUser || (!targetPass && !isQuick)) {
      setErrorMsg("Please fill in all credentials.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: targetUser, password: targetPass, isQuickLogin: isQuick }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        onLoginSuccess(result.user);
      } else {
        setErrorMsg(result.message || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      console.error("Login failure:", err);
      setErrorMsg("Connection error. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickWaiterLogin = () => {
    // Fill in values for user feedback
    setUsername("waiter");
    setPassword("waiterpassword");
    handleSubmit(undefined, { u: "waiter", p: "waiterpassword", isQuick: true });
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4" id="staff-login-view">
      <div className="bg-white border-2 border-hadero-dark/80 p-8 md:p-10 rounded-3xl shadow-xl max-w-md w-full relative overflow-hidden">
        {/* Decorative background blend */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-hadero-gold/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-hadero-dark/5 rounded-full blur-2xl pointer-events-none" />

        {/* Hadero Branding */}
        <div className="text-center mb-8 relative">
          <span className="text-[9px] font-extrabold tracking-[0.2em] text-[#9B9B45] uppercase bg-[#2A1D15] px-4 py-2 rounded-full inline-flex items-center gap-1" id="staff-portal-badge">
            <KeyRound size={10} />
            Staff Portal
          </span>
          <h2 className="font-serif text-3xl font-extrabold text-hadero-dark mt-6 tracking-tight">Hadero Coffee</h2>
          <p className="text-xs text-gray-500 font-medium italic mt-1.5">Authorized access only. Sign in to manage table orders.</p>
        </div>

        {/* Staff credentials notice */}
        <div className="mb-6 p-4 bg-hadero-cream border border-hadero-gold/10 rounded-2xl">
          <p className="text-[10px] text-gray-500 leading-normal text-center">
            Sign in using your authorized administrator or waiter staff credentials.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs flex items-center gap-2" id="login-error-alert">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 ml-1">Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <User size={15} />
              </span>
              <input
                id="login-username-input"
                type="text"
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-hadero-cream border border-hadero-gold/15 rounded-full pl-10 pr-4 py-2.5 text-xs text-hadero-dark placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-hadero-gold"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5 ml-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">Password</label>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={15} />
              </span>
              <input
                id="login-password-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-hadero-cream border border-hadero-gold/15 rounded-full pl-10 pr-11 py-2.5 text-xs text-hadero-dark placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-hadero-gold"
                required
              />
              <button
                id="toggle-password-visibility-btn"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-hadero-dark cursor-pointer"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-hadero-gold hover:bg-hadero-dark text-white hover:text-hadero-cream py-3.5 rounded-full font-bold text-[10px] uppercase tracking-[0.2em] transition-all disabled:opacity-50 mt-4 shadow-md cursor-pointer"
          >
            {loading ? "Authenticating..." : "Sign In to Portal"}
          </button>
        </form>

        <button
          id="login-cancel-btn"
          onClick={onCancel}
          className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-hadero-gold mt-6 transition-colors cursor-pointer"
        >
          Cancel and return to menu
        </button>
      </div>
    </div>
  );
}
