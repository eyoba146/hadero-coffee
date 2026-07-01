import React, { useState, useEffect } from "react";
import { Coffee, ShieldCheck, Lock, ChevronRight, User, Compass, HelpCircle, Sun, Moon } from "lucide-react";
import { AnimatePresence } from "motion/react";
import CustomerMenu from "./components/CustomerMenu";
import CustomerTracker from "./components/CustomerTracker";
import StaffLogin from "./components/StaffLogin";
import WaiterDashboard from "./components/WaiterDashboard";
import AdminDashboard from "./components/AdminDashboard";

type ViewState = "menu" | "tracker" | "login" | "waiter" | "admin";

interface StaffUser {
  id: string;
  username: string;
  role: "admin" | "waiter";
  fullName: string;
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewState>("menu");
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const cached = localStorage.getItem("hadero_dark_mode");
    return cached === "true";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    localStorage.setItem("hadero_dark_mode", String(isDarkMode));
  }, [isDarkMode]);

  // Parse portal parameter on boot
  useEffect(() => {
    setTableNumber("QR Scan");

    const params = new URLSearchParams(window.location.search);
    const portal = params.get("portal") || params.get("staff");
    if (portal === "true" || portal === "") {
      setActiveView("login");
    }

    // Attempt to recover logged-in staff user from session/local storage
    const cachedStaff = localStorage.getItem("hadero_staff");
    if (cachedStaff) {
      try {
        const user = JSON.parse(cachedStaff) as StaffUser;
        setStaffUser(user);
        setActiveView(user.role === "admin" ? "admin" : "waiter");
      } catch (_) {}
    }

    // Recover last order ID for convenient tracking
    const cachedOrder = localStorage.getItem("hadero_last_order");
    if (cachedOrder) {
      setActiveOrderId(cachedOrder);
    }
  }, []);

  const handleOrderPlaced = (orderId: string) => {
    setActiveOrderId(orderId);
    localStorage.setItem("hadero_last_order", orderId);
    setActiveView("tracker");
  };

  const handleLoginSuccess = (user: StaffUser) => {
    setStaffUser(user);
    localStorage.setItem("hadero_staff", JSON.stringify(user));
    setActiveView(user.role === "admin" ? "admin" : "waiter");
  };

  const handleLogout = () => {
    setStaffUser(null);
    localStorage.removeItem("hadero_staff");
    setActiveView("menu");
  };

  return (
    <div className="min-h-screen bg-hadero-cream flex flex-col justify-between selection:bg-hadero-gold selection:text-hadero-dark">
      {/* ----------------- APP NAVIGATION HEADER ----------------- */}
      <header className="bg-white/60 backdrop-blur-md text-hadero-dark border-b border-hadero-gold/20 sticky top-0 z-45">
        <div className="max-w-7xl mx-auto px-4 py-3.5 sm:py-4 flex items-center justify-between">
          
          {/* Brand Logo & Coffee Icon */}
          <button 
            id="header-logo-home"
            onClick={() => {
              if (staffUser) {
                setActiveView(staffUser.role === "admin" ? "admin" : "waiter");
              } else {
                setActiveView("menu");
              }
            }} 
            className="flex items-center gap-1.5 sm:gap-2.5 group cursor-pointer"
          >
            <div className="bg-hadero-dark text-hadero-gold p-1.5 sm:p-2 rounded-full group-hover:scale-105 transition-transform flex items-center justify-center">
              <Coffee className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <span className="font-serif text-sm sm:text-base md:text-xl font-bold tracking-tight block leading-none">
                HADERO
              </span>
              <span className="text-[7px] sm:text-[9px] uppercase tracking-[0.2em] text-hadero-gold font-bold block mt-0.5 sm:mt-1">
                Coffee Excellence
              </span>
            </div>
          </button>

          {/* Action Links & Context info */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* View order status button */}
            {!staffUser && activeOrderId && activeView !== "tracker" && (
              <button
                id="header-track-order-btn"
                onClick={() => setActiveView("tracker")}
                className="bg-hadero-gold hover:bg-hadero-dark text-hadero-dark hover:text-hadero-cream text-[10px] sm:text-xs font-bold px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-hadero-gold transition-colors cursor-pointer"
              >
                Track Order
              </button>
            )}

            {/* Back to menu button for tracked customers */}
            {!staffUser && activeView === "tracker" && (
              <button
                id="header-menu-back-btn"
                onClick={() => setActiveView("menu")}
                className="text-[10px] sm:text-xs font-bold text-hadero-dark hover:text-white transition-colors flex items-center gap-1 bg-white border border-hadero-dark/20 hover:bg-hadero-dark px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full cursor-pointer"
              >
                <Compass size={12} className="sm:w-3.5 sm:h-3.5" />
                Menu
              </button>
            )}

            {/* Divider */}
            {!staffUser && (
              <span className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />
            )}

            {/* Staff Navigation Indicator */}
            {staffUser ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-hadero-dark font-medium">
                  <User size={13} className="text-hadero-gold" />
                  {staffUser.fullName} ({staffUser.role.toUpperCase()})
                </span>
                <button
                  id="header-staff-logout"
                  onClick={handleLogout}
                  className="bg-red-50 hover:bg-red-600 border border-red-100 hover:border-red-600 text-red-600 hover:text-white text-[10px] sm:text-xs font-bold px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : activeView === "login" ? (
              <button
                id="header-customer-menu-btn"
                onClick={() => setActiveView("menu")}
                className="text-[10px] sm:text-xs font-bold text-hadero-dark hover:text-white transition-colors flex items-center gap-1 bg-white border border-hadero-dark/20 hover:bg-hadero-dark px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full cursor-pointer"
              >
                Menu
                <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5" />
              </button>
            ) : null}

            {/* Premium Theme Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={() => setIsDarkMode(prev => !prev)}
              className="p-1.5 sm:p-2.5 rounded-full bg-white border border-hadero-dark/10 text-hadero-dark hover:bg-hadero-dark hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-xs"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={14} className="text-hadero-gold" /> : <Moon size={14} className="text-hadero-dark" />}
            </button>
          </div>

        </div>
      </header>

      {/* ----------------- MAIN VIEW STAGE ----------------- */}
      <main className="flex-1 bg-hadero-cream py-8 relative">
        <AnimatePresence mode="wait">
          {activeView === "menu" && (
            <CustomerMenu
              tableNumber={tableNumber}
              onOrderPlaced={handleOrderPlaced}
            />
          )}

          {activeView === "tracker" && activeOrderId && (
            <CustomerTracker
              orderId={activeOrderId}
              onBackToMenu={() => setActiveView("menu")}
            />
          )}

          {activeView === "login" && (
            <StaffLogin
              onLoginSuccess={handleLoginSuccess}
              onCancel={() => setActiveView("menu")}
            />
          )}

          {activeView === "waiter" && staffUser && (
            <WaiterDashboard
              staffUser={staffUser}
              onLogout={handleLogout}
            />
          )}

          {activeView === "admin" && staffUser && (
            <AdminDashboard
              staffUser={staffUser}
              onLogout={handleLogout}
            />
          )}
        </AnimatePresence>
      </main>

      {/* ----------------- FOOTER BRANDING ----------------- */}
      <footer className="bg-hadero-dark text-gray-400 text-xs border-t border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <p className="font-bold text-hadero-cream/90">Hadero Coffee PLC</p>
            <p className="text-[11px] text-gray-400 mt-1">&copy; 2026 Hadero Coffee. All rights reserved. Addis Ababa, Ethiopia.</p>
          </div>
          <div className="flex gap-4 text-xs font-semibold">
            {staffUser ? (
              <span className="text-hadero-gold font-bold">Authorized Staff Terminal</span>
            ) : (
              <button id="footer-menu-btn" onClick={() => setActiveView("menu")} className="hover:text-hadero-gold transition-colors">Digital Menu</button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
