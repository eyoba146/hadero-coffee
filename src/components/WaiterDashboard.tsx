import React, { useState, useEffect, useRef } from "react";
import { Order } from "../types";
import { Clock, Coffee, Check, Archive, RefreshCw, Volume2, VolumeX, ShieldAlert, LogOut, FileText, CheckCircle2, Lock, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WaiterDashboardProps {
  staffUser: { id: string; username: string; role: "admin" | "waiter"; fullName: string };
  onLogout: () => void;
  isAdmin?: boolean; // Can be reused in admin dashboard
}

export default function WaiterDashboard({ staffUser, onLogout, isAdmin = false }: WaiterDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"Active" | "Completed">("Active");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // Self Change Password state (flow: current password -> new password -> confirm password)
  const [isSelfPasswordOpen, setIsSelfPasswordOpen] = useState<boolean>(false);
  const [selfCurrentPassword, setSelfCurrentPassword] = useState<string>("");
  const [selfNewPassword, setSelfNewPassword] = useState<string>("");
  const [selfConfirmPassword, setSelfConfirmPassword] = useState<string>("");
  const [selfPwdError, setSelfPwdError] = useState<string | null>(null);
  const [selfPwdSuccess, setSelfPwdSuccess] = useState<string | null>(null);

  const handleSelfChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfPwdError(null);
    setSelfPwdSuccess(null);

    if (selfNewPassword !== selfConfirmPassword) {
      setSelfPwdError("New password and confirmation do not match.");
      return;
    }

    try {
      const response = await fetch("/api/auth/self-change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: staffUser.username,
          currentPassword: selfCurrentPassword,
          newPassword: selfNewPassword
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSelfPwdSuccess("Password successfully changed!");
        setSelfCurrentPassword("");
        setSelfNewPassword("");
        setSelfConfirmPassword("");
        setTimeout(() => {
          setIsSelfPasswordOpen(false);
          setSelfPwdSuccess(null);
        }, 2000);
      } else {
        setSelfPwdError(result.message || "Failed to update password. Verify current password.");
      }
    } catch (err) {
      setSelfPwdError("Connection error.");
    }
  };
  
  // Keep track of order count to play beep on new orders
  const prevOrdersCountRef = useRef<number>(0);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders");
      if (!response.ok) throw new Error("Sync error");
      const data = await response.json();
      
      // Look for newly added orders to play audio notification
      const pendingCount = data.filter((o: any) => o.status === "Pending").length;
      if (prevOrdersCountRef.current > 0 && pendingCount > prevOrdersCountRef.current) {
        triggerNewOrderSound();
      }
      prevOrdersCountRef.current = pendingCount;

      setOrders(data);
      setSyncError(null);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setSyncError("Live synchronization lost. Retrying...");
    } finally {
      setLoading(false);
    }
  };

  // Poll for orders every 4 seconds
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio API beep for real-time notification
  const triggerNewOrderSound = () => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Dual beep sound
      const playBeep = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.1, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.05);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      playBeep(587.33, ctx.currentTime, 0.15); // D5 note
      setTimeout(() => {
        playBeep(880, ctx.currentTime, 0.25); // A5 note
      }, 180);
    } catch (error) {
      console.warn("Audio Context beep was blocked by browser autoplay constraints:", error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      // Update state immediately for perfect latency feel
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o))
      );
      
      // Play brief high-pitch feedback sound
      if (!isMuted) {
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 1200;
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Error: Could not update order status.");
    }
  };

  const getElapsedTime = (isoString: string) => {
    const placedTime = new Date(isoString).getTime();
    const now = Date.now();
    const diffMin = Math.floor((now - placedTime) / 60000);
    
    if (diffMin < 1) return "Just now";
    return `${diffMin}m ago`;
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "Cooking":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Served":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Completed":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter((o) => {
    if (activeTab === "Active") {
      return o.status === "Pending" || o.status === "Cooking" || o.status === "Served";
    } else {
      return o.status === "Completed";
    }
  });

  const activeCount = orders.filter((o) => o.status !== "Completed").length;
  const completedCount = orders.filter((o) => o.status === "Completed").length;
  const pendingCount = orders.filter((o) => o.status === "Pending").length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" id="waiter-dashboard-view">
      {/* Dashboard Top Header (Staff Welcome Info) */}
      {!isAdmin && (
        <div className="bg-white border border-hadero-dark/20 p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-hadero-gold bg-hadero-dark px-3.5 py-1.5 rounded-full inline-block">
              Logged in as {staffUser.role.toUpperCase()}
            </span>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-hadero-dark mt-2.5 sm:mt-3 tracking-tight">Welcome, {staffUser.fullName}!</h1>
            <p className="text-[11px] sm:text-xs text-gray-500 font-serif italic mt-1">Manage kitchen dispatching and update customer orders in real-time.</p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              id="waiter-change-pwd-btn"
              onClick={() => {
                setIsSelfPasswordOpen(true);
                setSelfCurrentPassword("");
                setSelfNewPassword("");
                setSelfConfirmPassword("");
                setSelfPwdError(null);
                setSelfPwdSuccess(null);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-hadero-gold bg-hadero-dark hover:bg-hadero-gold hover:text-hadero-dark px-3 py-2 sm:px-5 sm:py-2.5 rounded-full border border-hadero-gold/30 transition-all cursor-pointer shadow-sm whitespace-nowrap"
            >
              <Lock size={12} className="sm:w-3.5 sm:h-3.5" />
              Change Password
            </button>
            <button
              id="waiter-logout-btn"
              onClick={onLogout}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-red-600 bg-red-50 hover:bg-red-600 hover:text-white px-3 py-2 sm:px-5 sm:py-2.5 rounded-full border border-red-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut size={12} className="sm:w-3.5 sm:h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Sync State and Sounds Control */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-full border border-hadero-gold/20 p-1">
            <button
              id="tab-active-orders"
              onClick={() => setActiveTab("Active")}
              className={`px-5 py-2.5 rounded-full text-[10px] uppercase tracking-wider font-bold transition-all ${
                activeTab === "Active"
                  ? "bg-hadero-dark text-white shadow-sm"
                  : "text-gray-500 hover:text-hadero-dark"
              }`}
            >
              Active Orders ({activeCount})
            </button>
            <button
              id="tab-completed-orders"
              onClick={() => setActiveTab("Completed")}
              className={`px-5 py-2.5 rounded-full text-[10px] uppercase tracking-wider font-bold transition-all ${
                activeTab === "Completed"
                  ? "bg-hadero-dark text-white shadow-sm"
                  : "text-gray-500 hover:text-hadero-dark"
              }`}
            >
              Archive ({completedCount})
            </button>
          </div>

          {pendingCount > 0 && activeTab === "Active" && (
            <span className="animate-pulse bg-hadero-gold text-white font-extrabold text-[9px] uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border border-hadero-gold/10">
              {pendingCount} New
            </span>
          )}
        </div>

        {/* Audio Mute & Re-sync Controls */}
        <div className="flex items-center gap-3">
          {syncError ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xs">
              <ShieldAlert size={14} className="animate-bounce" />
              {syncError}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-gray-400">
              <RefreshCw size={11} className="animate-spin duration-3000" />
              Live Sync Active
            </span>
          )}

          <button
            id="toggle-mute-btn"
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-full border transition-all ${
              isMuted
                ? "bg-red-50 border-red-200 text-red-500"
                : "bg-white border-hadero-gold/20 text-gray-500 hover:text-hadero-dark"
            }`}
            title={isMuted ? "Unmute alerts" : "Mute alerts"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="text-center py-16" id="dashboard-loading">
          <RefreshCw className="animate-spin text-hadero-gold mx-auto mb-3" size={24} />
          <p className="text-sm text-gray-500 font-serif italic">Retrieving order lists...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-hadero-gold/15" id="no-dashboard-orders">
          <Archive size={40} className="mx-auto text-gray-300 mb-3" />
          <h3 className="font-serif text-lg font-bold text-hadero-dark">No orders to display</h3>
          <p className="text-xs text-gray-500 mt-1 font-serif italic">
            {activeTab === "Active"
              ? "All caught up! New customer orders will show up here instantly."
              : "No archived or finished orders found."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="dashboard-orders-grid">
          <AnimatePresence>
            {filteredOrders.map((order) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={order.id}
                className={`bg-white border-2 rounded-[2rem] p-6 shadow-md flex flex-col justify-between h-full relative overflow-hidden transition-all ${
                  order.status === "Pending" ? "border-yellow-500 ring-4 ring-yellow-400/10" : "border-hadero-dark/15 hover:border-hadero-gold/30"
                }`}
                id={`dashboard-order-card-${order.id}`}
              >
                {/* Card Top: Order Number, Table & Elapsed time */}
                <div>
                  <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-bold text-lg text-hadero-dark">{order.id}</h4>
                        <span className={`text-[9px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 block mt-1 font-serif italic">
                        Placed {getElapsedTime(order.createdAt)}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Order Items List */}
                  <div className="py-4 space-y-2.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs font-medium text-hadero-dark">
                        <span className="text-gray-600">
                          <strong className="text-hadero-gold mr-1.5 font-mono text-xs">x{item.quantity}</strong> {item.name}
                        </span>
                        <span className="text-gray-400 text-[11px] font-serif">{item.price * item.quantity} ETB</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Summary and Action CTA */}
                <div className="border-t border-gray-100 pt-4 mt-auto">
                  <div className="flex justify-between items-center text-xs mb-4">
                    <div>
                      <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-wider">Payment Method</span>
                      <span className="text-[10px] font-bold uppercase text-hadero-dark tracking-wider bg-hadero-cream px-3 py-1 rounded-full">{order.paymentMethod}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-wider">Total Due</span>
                      <span className="font-bold text-sm text-hadero-dark font-serif">{order.total} ETB</span>
                    </div>
                  </div>

                  {/* Dynamic Action Buttons with standard icons */}
                  <div className="flex gap-2">
                    {order.status === "Pending" && (
                      <button
                        id={`action-cook-${order.id}`}
                        onClick={() => !isAdmin && updateOrderStatus(order.id, "Cooking")}
                        disabled={isAdmin}
                        className={`w-full py-3 rounded-full font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                          isAdmin
                            ? "bg-gray-100 text-gray-400 border border-gray-200/60 cursor-not-allowed"
                            : "bg-hadero-gold hover:bg-hadero-dark text-white cursor-pointer"
                        }`}
                      >
                        <Coffee size={13} />
                        {isAdmin ? "Pending (View Only)" : "Start Preparing"}
                      </button>
                    )}

                    {order.status === "Cooking" && (
                      <button
                        id={`action-serve-${order.id}`}
                        onClick={() => !isAdmin && updateOrderStatus(order.id, "Served")}
                        disabled={isAdmin}
                        className={`w-full py-3 rounded-full font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                          isAdmin
                            ? "bg-gray-100 text-gray-400 border border-gray-200/60 cursor-not-allowed"
                            : "bg-hadero-dark hover:bg-hadero-gold text-white cursor-pointer"
                        }`}
                      >
                        <Check size={13} />
                        {isAdmin ? "Preparing (View Only)" : "Mark as Served"}
                      </button>
                    )}

                    {order.status === "Served" && (
                      <button
                        id={`action-complete-${order.id}`}
                        onClick={() => !isAdmin && updateOrderStatus(order.id, "Completed")}
                        disabled={isAdmin}
                        className={`w-full py-3 rounded-full font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                          isAdmin
                            ? "bg-gray-100 text-gray-400 border border-gray-200/60 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                        }`}
                      >
                        <CheckCircle2 size={13} />
                        {isAdmin ? "Served (View Only)" : "Complete Order"}
                      </button>
                    )}

                    {order.status === "Completed" && (
                      <div className="w-full bg-gray-100 text-gray-500 py-2.5 rounded-full text-center font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5">
                        <Archive size={13} />
                        Archived
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* --------------------------------------------------
          MODAL F: WAITER SELF PASSWORD UPDATE (FLOW: current -> new -> confirm)
          -------------------------------------------------- */}
      {isSelfPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" id="self-password-modal">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={18} className="text-hadero-gold" />
              <h3 className="font-serif text-lg font-bold text-hadero-dark">Change My Password</h3>
            </div>
            
            <p className="text-[10px] text-gray-500 mb-4 leading-normal">
              Keep your account secure by verifying your current password and choosing a new one.
            </p>

            <form onSubmit={handleSelfChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Current Password</label>
                <input
                  id="self-pwd-current"
                  type="password"
                  placeholder="Enter current password"
                  value={selfCurrentPassword}
                  onChange={(e) => setSelfCurrentPassword(e.target.value)}
                  className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">New Password</label>
                <input
                  id="self-pwd-new"
                  type="password"
                  placeholder="Enter new password"
                  value={selfNewPassword}
                  onChange={(e) => setSelfNewPassword(e.target.value)}
                  className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Confirm New Password</label>
                <input
                  id="self-pwd-confirm"
                  type="password"
                  placeholder="Re-type new password"
                  value={selfConfirmPassword}
                  onChange={(e) => setSelfConfirmPassword(e.target.value)}
                  className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                  required
                />
              </div>

              {selfPwdError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg font-bold flex items-center gap-1.5" id="self-pwd-error-alert">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{selfPwdError}</span>
                </div>
              )}

              {selfPwdSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-xs p-3 rounded-lg font-bold flex items-center gap-1.5" id="self-pwd-success-alert">
                  <Check size={14} className="shrink-0" />
                  <span>{selfPwdSuccess}</span>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  id="cancel-self-pwd-save"
                  type="button"
                  onClick={() => setIsSelfPasswordOpen(false)}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-bold py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  id="save-self-pwd-submit"
                  type="submit"
                  className="flex-1 bg-hadero-dark hover:bg-hadero-gold text-hadero-cream hover:text-hadero-dark text-xs font-bold py-2.5 rounded-xl"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
