import React, { useState, useEffect } from "react";
import { Order } from "../types";
import { Coffee, CheckCircle, Clock, Check, RefreshCw, ChevronLeft, CreditCard, Copy, Info } from "lucide-react";
import { motion } from "motion/react";

interface CustomerTrackerProps {
  orderId: string;
  onBackToMenu: () => void;
}

export default function CustomerTracker({ orderId, onBackToMenu }: CustomerTrackerProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<boolean>(false);
  const [paymentAccounts, setPaymentAccounts] = useState<any>(null);

  const fetchOrder = async (isManual = false) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error("Order not found or deleted");
      }
      const data = await response.json();
      setOrder(data);
      setErrorMsg(null);
    } catch (err) {
      console.error("Error loading order:", err);
      setErrorMsg("Failed to synchronize order status. Retrying...");
    } finally {
      if (loading) setLoading(false);
    }
  };

  // Fetch payment accounts so customer can pay even on tracker view
  useEffect(() => {
    fetch("/api/payment-accounts")
      .then((res) => res.json())
      .then((data) => setPaymentAccounts(data))
      .catch((err) => console.error("Error loading payment accounts:", err));
  }, []);

  // Poll for status updates every 4 seconds
  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => {
      fetchOrder();
    }, 4000);
    return () => clearInterval(interval);
  }, [orderId]);

  const getStatusStep = (status: Order["status"]) => {
    switch (status) {
      case "Pending": return 0;
      case "Cooking": return 1;
      case "Served": return 2;
      case "Completed": return 3;
      default: return 0;
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(true);
    setTimeout(() => setCopiedField(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center" id="tracker-loading">
        <RefreshCw className="animate-spin text-hadero-gold mb-4" size={32} />
        <p className="text-gray-500 font-serif italic text-sm">Synchronizing with Hadero kitchen...</p>
      </div>
    );
  }

  if (errorMsg && !order) {
    return (
      <div className="max-w-md mx-auto text-center px-4 py-16" id="tracker-error">
        <div className="bg-white border border-hadero-gold/20 p-6 rounded-2xl shadow-sm text-center">
          <Clock size={32} className="mx-auto text-red-500 mb-3" />
          <p className="font-serif italic text-sm text-gray-700">{errorMsg}</p>
          <div className="mt-5 flex gap-2 justify-center">
            <button
              onClick={() => { setLoading(true); fetchOrder(true); }}
              className="bg-hadero-gold text-white hover:bg-hadero-dark px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-wider cursor-pointer"
            >
              Retry Sync
            </button>
            <button
              onClick={onBackToMenu}
              className="bg-white border border-hadero-dark/20 text-hadero-dark hover:bg-gray-50 px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-wider cursor-pointer"
            >
              Return to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { label: "Received", desc: "Order sent to kitchen", icon: Clock },
    { label: "Cooking", desc: "Barista preparing", icon: Coffee },
    { label: "Served", desc: "On its way", icon: RefreshCw },
    { label: "Completed", desc: "Enjoy your meal", icon: CheckCircle },
  ];

  const currentStep = order ? getStatusStep(order.status) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6" id="order-tracker-view">
      {/* Back button */}
      <button
        id="tracker-back-to-menu-btn"
        onClick={onBackToMenu}
        className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-hadero-dark hover:text-hadero-gold mb-6 transition-colors"
      >
        <ChevronLeft size={14} />
        Order more items
      </button>

      {/* Main Card */}
      <div className="bg-white border border-hadero-gold/15 rounded-[2.25rem] p-6 md:p-8 shadow-md">
        {/* Tracker Header */}
        <div className="flex justify-between items-start pb-6 border-b border-gray-100">
          <div>
            <span className="text-[10px] font-bold text-hadero-gold uppercase tracking-widest block">Real-time Tracker</span>
            <h2 className="font-serif text-3xl font-bold text-hadero-dark mt-1 tracking-tight">Order {order?.id}</h2>
            <p className="text-xs text-gray-500 font-serif italic mt-1">Table {order?.table} &bull; {order ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</p>
          </div>
          <div className="bg-hadero-cream border border-hadero-gold/20 px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${order?.status === "Completed" ? "bg-green-400" : "bg-yellow-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${order?.status === "Completed" ? "bg-green-500" : "bg-yellow-500"}`}></span>
            </span>
            <span className="text-[10px] font-bold text-hadero-dark uppercase tracking-widest">{order?.status}</span>
          </div>
        </div>

        {/* Visual Progress Timeline */}
        <div className="py-8" id="tracker-timeline-flow">
          <div className="relative">
            {/* Background Line */}
            <div className="absolute top-5 left-6 right-6 h-1 bg-gray-100 -z-10" />
            {/* Filled Progress Line */}
            <div 
              className="absolute top-5 left-6 h-1 bg-hadero-gold -z-10 transition-all duration-1000 ease-out" 
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            />

            <div className="flex justify-between items-start">
              {steps.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = idx < currentStep;
                const isActive = idx === currentStep;

                return (
                  <div key={idx} className="flex flex-col items-center text-center max-w-[80px]" id={`tracker-step-${idx}`}>
                    {/* Circle Indicator */}
                    <div 
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-xs ${
                        isCompleted 
                          ? "bg-hadero-gold text-white ring-4 ring-hadero-gold/20" 
                          : isActive 
                            ? "bg-hadero-dark text-white ring-4 ring-hadero-dark/20 scale-105" 
                            : "bg-white border-2 border-gray-200 text-gray-400"
                      }`}
                    >
                      {isCompleted ? <Check size={16} strokeWidth={3} /> : <StepIcon size={16} />}
                    </div>

                    {/* Step label */}
                    <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 block ${isActive ? "text-hadero-dark font-extrabold" : "text-gray-500"}`}>
                      {step.label}
                    </span>
                    <span className="text-[9px] text-gray-400 mt-0.5 leading-tight hidden sm:block">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Details Summary */}
        <div className="bg-hadero-cream rounded-2xl p-5 border border-hadero-gold/20 mt-4 space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Items Summary</h3>
          <div className="space-y-3" id="tracker-summary-items">
            {order?.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-xs border-b border-gray-200/50 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-hadero-gold">x{item.quantity}</span>
                  <span className="font-bold text-hadero-dark">{item.name}</span>
                </div>
                <span className="font-bold text-hadero-dark font-serif">{item.price * item.quantity} ETB</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Payment Method</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-hadero-dark bg-white border border-hadero-gold/20 px-2.5 py-1 rounded-full inline-block mt-0.5">
                {order?.paymentMethod}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Total Price</span>
              <span className="font-bold text-lg text-hadero-dark font-serif">{order?.total} ETB</span>
            </div>
          </div>
        </div>

        {/* Floating payment copying guide in tracker */}
        {order && order.paymentMethod !== "Cash" && paymentAccounts && (
          <div className="mt-6 border-t border-gray-100 pt-6 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Payment Accounts</h4>
            <div className="bg-white border border-hadero-gold/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs">
                <span className="font-bold text-hadero-dark uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={13} className="text-hadero-gold" />
                  {order.paymentMethod === "Telebirr" && paymentAccounts.telebirr.name}
                  {order.paymentMethod === "CBE Birr" && paymentAccounts.cbeBirr.name}
                  {order.paymentMethod === "CBE" && paymentAccounts.cbe.name}
                </span>
                <span className="font-mono text-gray-600 block mt-1.5">
                  Acc: {order.paymentMethod === "Telebirr" ? paymentAccounts.telebirr.accountNumber :
                        order.paymentMethod === "CBE Birr" ? paymentAccounts.cbeBirr.accountNumber :
                        paymentAccounts.cbe.accountNumber}
                </span>
              </div>
              <button
                id="tracker-copy-acc-btn"
                onClick={() => {
                  const acc = order.paymentMethod === "Telebirr" ? paymentAccounts.telebirr.accountNumber :
                              order.paymentMethod === "CBE Birr" ? paymentAccounts.cbeBirr.accountNumber :
                              paymentAccounts.cbe.accountNumber;
                  if (acc) handleCopyText(acc);
                }}
                className="bg-hadero-cream hover:bg-hadero-dark text-hadero-dark hover:text-white border border-hadero-dark/20 px-4 py-2 rounded-full text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5 self-start sm:self-auto transition-all cursor-pointer"
              >
                {copiedField ? (
                  <>
                    <Check size={14} className="text-green-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Account</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-start gap-1.5 text-[10px] text-gray-400">
              <Info size={11} className="text-hadero-gold shrink-0 mt-0.5" />
              <span>We only display account info. Open your banking app to transfer manually. No direct integration needed.</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-center bg-white border border-hadero-gold/15 rounded-2xl p-4">
        <p className="text-xs text-gray-500 font-serif italic leading-relaxed">
          Please keep this page open to watch progress. Your barista is working on your order.
          Need assistance? Inform your table waiter directly.
        </p>
      </div>
    </div>
  );
}
