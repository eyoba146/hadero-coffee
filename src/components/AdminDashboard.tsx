import React, { useState, useEffect, useRef } from "react";
import { MenuItem, Staff } from "../types";
import { 
  Coffee, Users, Lock, QrCode, Plus, Edit, Trash2, Camera, Upload, Image as ImageIcon,
  Check, Play, Power, RotateCw, AlertCircle, Eye, LogOut, CheckSquare, Save
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import WaiterDashboard from "./WaiterDashboard";

interface AdminDashboardProps {
  staffUser: { id: string; username: string; role: "admin" | "waiter"; fullName: string };
  onLogout: () => void;
}

export default function AdminDashboard({ staffUser, onLogout }: AdminDashboardProps) {
  const [activePanel, setActivePanel] = useState<"LiveDispatcher" | "ManageMenu" | "StaffAccounts" | "QRSignage">("LiveDispatcher");
  
  // Menu management state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isMenuFormOpen, setIsMenuFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Menu Form Inputs
  const [formName, setFormName] = useState<string>("");
  const [formCategory, setFormCategory] = useState<string>("Drinks");
  const [isCustomCategoryActive, setIsCustomCategoryActive] = useState<boolean>(false);
  const [customCategoryInput, setCustomCategoryInput] = useState<string>("");
  const [formPrice, setFormPrice] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formImage, setFormImage] = useState<string>("/uploads/placeholder_macchiato.jpg");
  const [formAvailable, setFormAvailable] = useState<boolean>(true);

  // Staff management state
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isStaffFormOpen, setIsStaffFormOpen] = useState<boolean>(false);
  const [staffUsername, setStaffUsername] = useState<string>("");
  const [staffFullName, setStaffFullName] = useState<string>("");
  const [staffRole, setStaffRole] = useState<"admin" | "waiter">("waiter");
  const [staffPassword, setStaffPassword] = useState<string>("");

  // Change Password state (Admin only change staff passwords)
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState<boolean>(false);
  const [pwdTargetUser, setPwdTargetUser] = useState<string>("");
  const [pwdNewValue, setPwdNewValue] = useState<string>("");
  const [pwdSuccessMsg, setPwdSuccessMsg] = useState<string | null>(null);

  // Self Change Password state (flow: current password -> new password -> confirm password)
  const [isSelfPasswordOpen, setIsSelfPasswordOpen] = useState<boolean>(false);
  const [selfCurrentPassword, setSelfCurrentPassword] = useState<string>("");
  const [selfNewPassword, setSelfNewPassword] = useState<string>("");
  const [selfConfirmPassword, setSelfConfirmPassword] = useState<string>("");
  const [selfPwdError, setSelfPwdError] = useState<string | null>(null);
  const [selfPwdSuccess, setSelfPwdSuccess] = useState<string | null>(null);

  // Image upload and capture modals
  const [isImagePickerOpen, setIsImagePickerOpen] = useState<boolean>(false);
  const [serverImages, setServerImages] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load menu items, staff, and server images
  const loadMenu = () => {
    fetch("/api/menu")
      .then((res) => res.json())
      .then((data) => setMenuItems(data))
      .catch((err) => console.error("Error loading menu:", err));
  };

  const loadStaff = () => {
    fetch("/api/staff")
      .then((res) => res.json())
      .then((data) => setStaffList(data))
      .catch((err) => console.error("Error loading staff:", err));
  };

  const loadImagesGallery = () => {
    fetch("/api/images")
      .then((res) => res.json())
      .then((data) => setServerImages(data))
      .catch((err) => console.error("Error loading images:", err));
  };

  useEffect(() => {
    loadMenu();
    loadStaff();
    loadImagesGallery();
  }, []);

  const triggerNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --------------------------------------------------
  // CAMERA PHOTO CAPTURE ACTIONS
  // --------------------------------------------------
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError("Could not access webcam. Please check iframe browser permissions.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg");

    stopCamera();
    uploadBase64Image(dataUrl);
  };

  const uploadBase64Image = async (base64Data: string) => {
    setUploadLoading(true);
    try {
      const response = await fetch("/api/upload-base64", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: base64Data }),
      });
      const result = await response.json();
      if (result.success && result.imageUrl) {
        setFormImage(result.imageUrl);
        triggerNotification("Photo captured and assigned successfully!");
        setIsImagePickerOpen(false);
        loadImagesGallery();
      } else {
        triggerNotification("Failed to upload captured photo.", "error");
      }
    } catch (err) {
      console.error("Upload error:", err);
      triggerNotification("Connection error during photo upload.", "error");
    } finally {
      setUploadLoading(false);
    }
  };

  // --------------------------------------------------
  // LOCAL FILE UPLOAD ACTIONS
  // --------------------------------------------------
  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (result.success && result.imageUrl) {
        setFormImage(result.imageUrl);
        triggerNotification("Image file uploaded successfully!");
        setIsImagePickerOpen(false);
        loadImagesGallery();
      } else {
        triggerNotification("Failed to upload local image.", "error");
      }
    } catch (err) {
      console.error("Local upload error:", err);
      triggerNotification("Connection error during file upload.", "error");
    } finally {
      setUploadLoading(false);
    }
  };

  // --------------------------------------------------
  // MENU OPERATIONS (ADD / EDIT / DELETE)
  // --------------------------------------------------
  const openMenuForm = (item: MenuItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormName(item.name);
      setFormCategory(item.category);
      setFormPrice(String(item.price));
      setFormDescription(item.description);
      setFormImage(item.image);
      setFormAvailable(item.available);
      setIsCustomCategoryActive(false);
      setCustomCategoryInput("");
    } else {
      setEditingItem(null);
      setFormName("");
      setFormCategory("Drinks");
      setFormPrice("");
      setFormDescription("");
      setFormImage("/uploads/placeholder_macchiato.jpg");
      setFormAvailable(true);
      setIsCustomCategoryActive(false);
      setCustomCategoryInput("");
    }
    setIsMenuFormOpen(true);
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice) {
      triggerNotification("Name and Price are required.", "error");
      return;
    }

    const finalCategory = isCustomCategoryActive 
      ? (customCategoryInput.trim() || "Drinks") 
      : formCategory;

    const payload = {
      name: formName,
      category: finalCategory,
      price: Number(formPrice),
      description: formDescription,
      image: formImage,
      available: formAvailable
    };

    try {
      const url = editingItem ? `/api/menu/${editingItem.id}` : "/api/menu";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        triggerNotification(editingItem ? "Menu item updated!" : "New menu item added!");
        setIsMenuFormOpen(false);
        loadMenu();
      } else {
        triggerNotification(result.message || "Failed to save menu item.", "error");
      }
    } catch (err) {
      console.error("Save menu error:", err);
      triggerNotification("Network error while saving menu item.", "error");
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;

    try {
      const res = await fetch(`/api/menu/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        triggerNotification("Menu item deleted.");
        loadMenu();
      } else {
        triggerNotification("Could not delete menu item.", "error");
      }
    } catch (err) {
      console.error("Delete menu error:", err);
      triggerNotification("Network error while deleting item.", "error");
    }
  };

  // --------------------------------------------------
  // STAFF OPERATIONS (ADD / DELETE / PASSWORD)
  // --------------------------------------------------
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffUsername || !staffPassword) {
      triggerNotification("Username and Password are required.", "error");
      return;
    }

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: staffUsername,
          password: staffPassword,
          role: staffRole,
          fullName: staffFullName || staffUsername
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        triggerNotification("Staff account created successfully!");
        setIsStaffFormOpen(false);
        setStaffUsername("");
        setStaffFullName("");
        setStaffPassword("");
        loadStaff();
      } else {
        triggerNotification(result.message || "Failed to create staff account.", "error");
      }
    } catch (err) {
      console.error("Create staff error:", err);
      triggerNotification("Network error creating staff.", "error");
    }
  };

  const handleToggleStaffStatus = async (id: string, username: string, currentStatus?: string) => {
    if (username === staffUser.username) {
      triggerNotification("You cannot revoke your own logged-in admin account!", "error");
      return;
    }
    
    const isRevoked = currentStatus === "revoked";
    const actionText = isRevoked ? "Restore access (Activate)" : "Revoke access (Suspend)";
    if (!confirm(`${actionText} for staff member "${username}"?`)) return;

    try {
      const res = await fetch(`/api/staff/${id}/toggle-status`, { method: "POST" });
      const result = await res.json();
      if (res.ok && result.success) {
        triggerNotification(`Staff account status updated: ${result.message}`);
        loadStaff();
      } else {
        triggerNotification(result.message || "Failed to update staff status.", "error");
      }
    } catch (err) {
      console.error("Toggle staff status error:", err);
      triggerNotification("Network error updating status.", "error");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdTargetUser || !pwdNewValue) {
      triggerNotification("Target user and password value are required.", "error");
      return;
    }

    // Capture the requesting admin username
    const adminUsername = staffUser.username;
    if (!confirm(`Change password of staff member "${pwdTargetUser}" to "${pwdNewValue}"?`)) return;

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUsername: pwdTargetUser,
          newPassword: pwdNewValue,
          adminUsername
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setPwdSuccessMsg(`Password successfully updated for "${pwdTargetUser}"!`);
        setPwdNewValue("");
        setTimeout(() => {
          setPwdSuccessMsg(null);
          setIsPasswordFormOpen(false);
        }, 3000);
      } else {
        triggerNotification(result.message || "Failed to change password. Unauthorized.", "error");
      }
    } catch (err) {
      console.error("Change password error:", err);
      triggerNotification("Network error changing password.", "error");
    }
  };

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
        triggerNotification("Password changed successfully!");
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6" id="admin-dashboard-view">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-55 px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 border text-xs font-bold ${
              notification.type === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {notification.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Title Card & Nav tabs */}
      <div className="bg-white border-2 border-hadero-dark/20 p-5 sm:p-6 md:p-8 rounded-3xl shadow-md mb-6 sm:mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-hadero-gold bg-hadero-dark px-3.5 py-1.5 rounded-full inline-block">
            Hadero Administrator Portal
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-hadero-dark mt-2.5 sm:mt-3 tracking-tight">System Administration</h1>
          <p className="text-[11px] sm:text-xs text-gray-500 font-serif italic mt-1">Configure menus, staff records, printable tables, and live order dispatches.</p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 self-stretch lg:self-auto w-full lg:w-auto">
          <button
            id="admin-change-my-pwd-trigger"
            onClick={() => {
              setIsSelfPasswordOpen(true);
              setSelfCurrentPassword("");
              setSelfNewPassword("");
              setSelfConfirmPassword("");
              setSelfPwdError(null);
              setSelfPwdSuccess(null);
            }}
            className="flex-1 lg:flex-initial flex items-center justify-center gap-1 bg-hadero-dark text-hadero-gold hover:bg-hadero-gold hover:text-hadero-dark text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-full border border-hadero-gold/30 transition-all cursor-pointer shadow-sm whitespace-nowrap"
          >
            <Lock size={12} className="sm:w-3.5 sm:h-3.5" />
            My Password
          </button>
          <button
            id="admin-change-pwd-trigger"
            onClick={() => { setIsPasswordFormOpen(true); setPwdTargetUser(""); setPwdNewValue(""); }}
            className="flex-1 lg:flex-initial flex items-center justify-center gap-1 bg-white text-gray-600 hover:bg-gray-100 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-full border border-hadero-dark/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Users size={12} className="sm:w-3.5 sm:h-3.5" />
            Reset Staff
          </button>
          <button
            id="admin-logout-btn"
            onClick={onLogout}
            className="flex-1 lg:flex-initial flex items-center justify-center gap-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-full border border-red-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut size={12} className="sm:w-3.5 sm:h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Panel Navigator */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto pb-1 scrollbar-none gap-2">
        {[
          { id: "LiveDispatcher", label: "Live Orders", icon: Coffee },
          { id: "ManageMenu", label: "Manage Menu", icon: Edit },
          { id: "StaffAccounts", label: "Staff Accounts", icon: Users },
          { id: "QRSignage", label: "Digital QR Signs", icon: QrCode }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activePanel === tab.id;
          return (
            <button
              id={`panel-tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActivePanel(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? "border-hadero-gold text-hadero-dark bg-white font-extrabold"
                  : "border-transparent text-gray-500 hover:text-hadero-dark hover:border-gray-200"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* --------------------------------------------------
          PANEL 1: LIVE ORDERS DISPATCHER (REUSED COMPONENT)
          -------------------------------------------------- */}
      {activePanel === "LiveDispatcher" && (
        <div id="panel-live-orders">
          <WaiterDashboard staffUser={staffUser} onLogout={onLogout} isAdmin={true} />
        </div>
      )}

      {/* --------------------------------------------------
          PANEL 2: MANAGE MENU ITEMS
          -------------------------------------------------- */}
      {activePanel === "ManageMenu" && (
        <div className="space-y-6" id="panel-manage-menu">
          <div className="flex justify-between items-center bg-white p-5 border border-hadero-gold/20 rounded-2xl">
            <div>
              <h2 className="font-serif text-xl font-bold text-hadero-dark">Food &amp; Beverage Catalog</h2>
              <p className="text-xs text-gray-500 font-serif italic mt-1">Configure pricing, details, and photography for Hadero Menu items.</p>
            </div>
            <button
              id="add-menu-item-btn"
              onClick={() => openMenuForm()}
              className="bg-hadero-dark text-white hover:bg-hadero-gold hover:text-hadero-dark px-4 py-2.5 rounded-full text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={15} />
              Add Menu Item
            </button>
          </div>

          {/* Menu Items Table List */}
          <div className="bg-white border border-hadero-gold/15 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px] lg:min-w-full">
                <thead>
                  <tr className="bg-hadero-cream border-b border-hadero-gold/10 text-[10px] uppercase tracking-wider font-bold text-gray-500">
                    <th className="p-4 pl-6">Item</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-hadero-cream/40 transition-colors" id={`admin-menu-row-${item.id}`}>
                      {/* Name and Image */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-lg object-cover bg-hadero-dark border border-gray-200"
                          />
                          <div>
                            <span className="font-bold text-sm text-hadero-dark block">{item.name}</span>
                            <span className="text-gray-500 font-medium text-[11px] line-clamp-1 max-w-[280px] mt-0.5">
                              {item.description || "No description set."}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Category */}
                      <td className="p-4 font-semibold text-gray-600">
                        <span className="bg-white border border-gray-200 text-[10px] px-2.5 py-1 rounded-md font-bold">
                          {item.category}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="p-4 font-bold text-sm text-hadero-dark">
                        {item.price} ETB
                      </td>

                      {/* Available status */}
                      <td className="p-4 font-medium">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md ${
                          item.available 
                            ? "bg-green-50 text-green-700 border border-green-100" 
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.available ? "bg-green-500" : "bg-red-500"}`} />
                          {item.available ? "Available" : "Sold Out"}
                        </span>
                      </td>

                      {/* Action Triggers */}
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            id={`edit-menu-${item.id}`}
                            onClick={() => openMenuForm(item)}
                            className="p-2 rounded-lg bg-gray-50 hover:bg-hadero-gold text-gray-600 hover:text-hadero-dark transition-colors"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            id={`delete-menu-${item.id}`}
                            onClick={() => handleDeleteMenuItem(item.id)}
                            className="p-2 rounded-lg bg-red-50 hover:bg-red-600 text-red-500 hover:text-white transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------
          PANEL 3: STAFF ACCOUNTS
          -------------------------------------------------- */}
      {activePanel === "StaffAccounts" && (
        <div className="space-y-6" id="panel-staff-accounts">
          <div className="bg-white p-6 border border-hadero-gold/15 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-hadero-dark">System Access &amp; Staff Logins</h2>
              <p className="text-xs text-gray-500 font-serif italic mt-1 max-w-xl">
                ℹ️ Floor waiters use the single master <span className="font-mono bg-hadero-cream px-1.5 py-0.5 rounded text-hadero-dark font-bold">waiter</span> account on all table service devices. 
                Below, you can configure their passwords or suspend/revoke their access. New staff accounts are disabled to protect the single-login master flow.
              </p>
            </div>
          </div>

          {/* Staff list grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="staff-accounts-list">
            {staffList.map((staff) => (
              <div 
                key={staff.id} 
                className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between"
                id={`staff-card-${staff.id}`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-hadero-dark text-base">{staff.fullName}</h4>
                      <span className="text-[10px] font-mono text-gray-400 mt-0.5 block">ID: {staff.id}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                        staff.role === "admin"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {staff.role}
                      </span>
                      <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        staff.status === "revoked"
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-emerald-50 text-emerald-600 border-emerald-200"
                      }`}>
                        {staff.status === "revoked" ? "● Suspended" : "● Active"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-hadero-cream border border-gray-100 p-3 rounded-xl mt-4 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Username:</span>
                      <strong className="text-hadero-dark font-mono">{staff.username}</strong>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mt-5 flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-semibold">Security Settings</span>
                  {staff.username !== "admin" ? (
                    <button
                      id={`toggle-staff-${staff.id}`}
                      onClick={() => handleToggleStaffStatus(staff.id, staff.username, staff.status)}
                      className={`text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                        staff.status === "revoked"
                          ? "text-emerald-600 hover:text-emerald-800 hover:underline"
                          : "text-red-500 hover:text-red-700 hover:underline"
                      }`}
                    >
                      <Power size={13} />
                      {staff.status === "revoked" ? "Activate Access" : "Revoke Access"}
                    </button>
                  ) : (
                    <span className="text-[10px] text-purple-500 font-bold italic">Admin Master</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------
          PANEL 4: DIGITAL QR TABLE SIGNAGE GENERATOR
          -------------------------------------------------- */}
      {activePanel === "QRSignage" && (
        <div className="space-y-6" id="panel-qr-signage">
          <div className="bg-white p-6 border border-hadero-gold/20 rounded-2xl shadow-sm">
            <h2 className="font-serif text-xl font-bold text-hadero-dark">Table Ordering Signage Sheet</h2>
            <p className="text-xs text-gray-500 font-serif italic mt-1 max-w-2xl">
              Print these table signage cards and display them on your restaurant tables. 
              Customers scan the unique QR code, which instantly directs them to your digital menu pre-set for their specific table.
            </p>
          </div>

          {/* Printable Layout Sheet */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="qr-signage-cards">
            {[1, 2, 3, 4, 5, 6].map((tableNum) => {
              const appUrl = window.location.origin + "/?table=" + tableNum;
              const qrCodeUrl = `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${encodeURIComponent(appUrl)}`;

              return (
                <div 
                  key={tableNum}
                  className="bg-white border-2 border-hadero-dark/40 p-6 rounded-3xl shadow-md text-center relative overflow-hidden flex flex-col items-center justify-between min-h-[380px] hover:border-hadero-gold transition-all"
                  id={`qr-table-card-${tableNum}`}
                >
                  {/* Card Border frame branding */}
                  <div className="absolute top-2 left-2 right-2 bottom-2 border border-hadero-gold/20 pointer-events-none rounded-2xl opacity-60" />

                  {/* Card Header logo */}
                  <div>
                    <span className="font-serif text-2xl font-black text-hadero-dark tracking-tight block uppercase">
                      Hadero
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-hadero-cream bg-hadero-dark px-3 py-1 rounded-full inline-block mt-1.5">
                      Coffee
                    </span>
                  </div>

                  {/* The Live QR Code (Google Chart API) */}
                  <div className="my-5 bg-hadero-cream p-4 rounded-2xl border border-hadero-gold/15 shadow-sm relative group">
                    <img 
                      src={qrCodeUrl} 
                      alt={`Table ${tableNum} QR Code`} 
                      className="w-36 h-36 object-contain mx-auto"
                    />
                    <div className="absolute inset-0 bg-white/95 opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center p-3 text-center transition-all duration-300 rounded-2xl">
                      <span className="text-[9px] uppercase font-bold text-gray-400">Target Address</span>
                      <span className="text-[9px] font-mono font-medium text-gray-600 break-all leading-normal mt-1 px-1">
                        {appUrl}
                      </span>
                    </div>
                  </div>

                  {/* Card Table Title */}
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] text-hadero-gold font-bold block uppercase tracking-widest">Scan to Order</span>
                    <h3 className="font-serif text-3xl font-black text-hadero-dark">TABLE {tableNum}</h3>
                    <p className="text-[10px] text-gray-400">Order sent directly to baristas. Pay via Mobile Money.</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --------------------------------------------------
          MODAL A: ADD/EDIT MENU ITEM FORM
          -------------------------------------------------- */}
      {isMenuFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50" id="menu-form-modal">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-serif text-lg font-bold text-hadero-dark">
                {editingItem ? "Edit Menu Item" : "Create New Menu Item"}
              </h3>
              <button
                id="close-menu-modal"
                onClick={() => setIsMenuFormOpen(false)}
                className="text-gray-400 hover:text-hadero-dark text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveMenuItem} className="p-6 space-y-4 flex-1">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Item Name</label>
                <input
                  id="form-menu-name"
                  type="text"
                  placeholder="e.g. Hadero Double Macchiato"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                  required
                />
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Category</label>
                    {isCustomCategoryActive && (
                      <button
                        type="button"
                        onClick={() => setIsCustomCategoryActive(false)}
                        className="text-[9px] uppercase font-bold text-hadero-gold hover:underline cursor-pointer"
                      >
                        Choose Existing
                      </button>
                    )}
                  </div>
                  {isCustomCategoryActive ? (
                    <input
                      id="form-menu-custom-category"
                      type="text"
                      placeholder="e.g. Pastries"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                      required
                    />
                  ) : (
                    <select
                      id="form-menu-category"
                      value={formCategory}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setIsCustomCategoryActive(true);
                          setCustomCategoryInput("");
                        } else {
                          setFormCategory(e.target.value);
                        }
                      }}
                      className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                    >
                      {Array.from(new Set([...menuItems.map((item) => item.category), "Drinks", "Foods"])).filter(Boolean).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__custom__">+ Create New Category dynamically...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Price (ETB)</label>
                  <input
                    id="form-menu-price"
                    type="number"
                    placeholder="e.g. 110"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Description</label>
                <textarea
                  id="form-menu-desc"
                  placeholder="Tell customers about this item's ingredients, size, and flavor profile..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold resize-none"
                />
              </div>

              {/* Image Input field & Photo Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Item Photography</label>
                
                {/* Gorgeous Premium Clickable Card Block */}
                <button
                  id="open-image-picker-btn"
                  type="button"
                  onClick={() => setIsImagePickerOpen(true)}
                  className="w-full group relative overflow-hidden bg-hadero-cream hover:bg-hadero-cream/70 border-2 border-dashed border-hadero-gold/30 hover:border-hadero-gold rounded-2xl p-5 transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                >
                  {formImage ? (
                    <div className="w-full flex flex-col items-center gap-3">
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-md border-2 border-white">
                        <img 
                          src={formImage} 
                          alt="Preview" 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                        />
                        <div className="absolute inset-0 bg-hadero-dark/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                          <Camera size={18} className="text-white" />
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-[11px] font-bold text-hadero-dark block">Change Menu Photography</span>
                        <span className="text-[9px] text-gray-400 font-medium">Click to capture a new photo or select from server library</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 flex flex-col items-center gap-2">
                      <div className="p-3 bg-hadero-gold/10 rounded-full text-hadero-gold group-hover:scale-110 transition-transform duration-300">
                        <Camera size={22} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-hadero-dark block">Tap to Select/Snaps Photography</span>
                        <span className="text-[9px] text-gray-400">Webcam capture or server gallery access</span>
                      </div>
                    </div>
                  )}
                </button>

                {/* Collapsible Manual URL input */}
                <details className="mt-2 text-left">
                  <summary className="text-[9px] font-bold text-gray-400 hover:text-hadero-dark cursor-pointer list-none flex items-center gap-1 uppercase tracking-widest justify-end select-none">
                    <span>Advanced: edit photography path</span>
                  </summary>
                  <div className="mt-1.5">
                    <input
                      id="form-menu-image-url"
                      type="text"
                      placeholder="Image address"
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[10px] text-hadero-dark font-mono focus:outline-none focus:ring-1 focus:ring-hadero-gold"
                    />
                  </div>
                </details>
              </div>

              {/* Available availability toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="form-menu-available"
                  type="checkbox"
                  checked={formAvailable}
                  onChange={(e) => setFormAvailable(e.target.checked)}
                  className="w-4 h-4 text-hadero-gold border-gray-300 rounded-sm focus:ring-hadero-gold"
                />
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer select-none">
                  In stock &amp; available to order
                </label>
              </div>

              {/* Modal Save CTAs */}
              <div className="border-t border-gray-100 pt-5 flex gap-2 mt-4">
                <button
                  id="cancel-menu-save"
                  type="button"
                  onClick={() => setIsMenuFormOpen(false)}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-bold py-3 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  id="save-menu-submit"
                  type="submit"
                  className="flex-1 bg-hadero-dark hover:bg-hadero-gold text-hadero-cream hover:text-hadero-dark text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-1"
                >
                  <Save size={14} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------
          MODAL B: IMAGE PICKER & PHOTO CAPTURING FEED
          -------------------------------------------------- */}
      {isImagePickerOpen && (
        <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4 bg-black/75" id="image-picker-modal">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-hadero-dark">Item Image Selector</h3>
                <p className="text-[10px] text-gray-500">Capture a new photo via webcam or reuse previously uploaded menu images.</p>
              </div>
              <button
                id="close-image-picker"
                onClick={() => { stopCamera(); setIsImagePickerOpen(false); }}
                className="text-gray-400 hover:text-hadero-dark font-bold text-xs"
              >
                Close Gallery
              </button>
            </div>

            {/* Top section: Camera / Local File Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Webcam Live Capture */}
              <div className="bg-hadero-cream border border-gray-200 rounded-xl p-4 flex flex-col justify-between min-h-[220px]">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                    <Camera size={14} className="text-hadero-gold" />
                    Live Camera Feed
                  </span>
                  {isCameraActive && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                  )}
                </div>

                {cameraError ? (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-1.5 mb-3">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                ) : null}

                {/* Video Stage viewport */}
                <div className="bg-hadero-dark h-36 rounded-lg overflow-hidden relative flex items-center justify-center border border-gray-300">
                  {isCameraActive ? (
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-cover transform scale-x-[-1]" 
                      playsInline
                    />
                  ) : (
                    <span className="text-gray-400 text-xs font-medium px-4 text-center">Camera currently idle.</span>
                  )}
                  {/* Hidden Canvas for drawing picture */}
                  <canvas ref={canvasRef} width="640" height="480" className="hidden" />
                </div>

                {/* Camera Buttons */}
                <div className="flex gap-2 mt-4">
                  {!isCameraActive ? (
                    <button
                      id="start-camera-btn"
                      type="button"
                      onClick={startCamera}
                      className="flex-1 bg-hadero-dark hover:bg-hadero-gold text-hadero-cream hover:text-hadero-dark py-2 rounded-lg text-xs font-bold transition-all"
                    >
                      Activate Camera
                    </button>
                  ) : (
                    <>
                      <button
                        id="stop-camera-btn"
                        type="button"
                        onClick={stopCamera}
                        className="flex-1 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        Turn Off
                      </button>
                      <button
                        id="capture-snap-btn"
                        type="button"
                        onClick={capturePhoto}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                      >
                        <Check size={14} />
                        Snap Photo
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Local File Uploader */}
              <div className="bg-hadero-cream border border-gray-200 rounded-xl p-4 flex flex-col justify-between min-h-[220px]">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5 mb-3">
                    <Upload size={14} className="text-hadero-gold" />
                    Local Disk Upload
                  </span>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    Select a high-quality coffee or pastry JPG/PNG file directly from your local computer storage to upload and use.
                  </p>
                </div>

                <div className="mt-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLocalFileUpload}
                    className="hidden"
                  />
                  <button
                    id="trigger-file-select-btn"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLoading}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-hadero-gold bg-white hover:bg-hadero-cream/30 py-6 rounded-xl text-xs font-bold text-gray-500 hover:text-hadero-dark transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <ImageIcon size={24} className="text-gray-400" />
                    {uploadLoading ? "Uploading to Server..." : "Select Local Image File"}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom section: Re-using Existing Server Images gallery */}
            <div className="border-t border-gray-100 pt-5 flex-1 overflow-y-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5 mb-4">
                <ImageIcon size={14} className="text-hadero-gold" />
                Select &amp; Reuse Previously Uploaded Images
              </span>

              {serverImages.length === 0 ? (
                <p className="text-center py-6 text-xs text-gray-400 font-medium">No previous uploads found in the library.</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[180px] overflow-y-auto pr-1">
                  {serverImages.map((imgUrl, idx) => (
                    <button
                      id={`gallery-img-${idx}`}
                      key={idx}
                      type="button"
                      onClick={() => { setFormImage(imgUrl); setIsImagePickerOpen(false); stopCamera(); triggerNotification("Image selected from library!"); }}
                      className={`h-16 rounded-lg overflow-hidden bg-hadero-dark border-2 transition-all relative group ${
                        formImage === imgUrl ? "border-hadero-gold scale-95 ring-2 ring-hadero-gold/20" : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <img 
                        src={imgUrl} 
                        alt="Gallery" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Check size={14} className="text-white font-black" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------
          MODAL C: PROVISION NEW STAFF ACCOUNT FORM
          -------------------------------------------------- */}
      {isStaffFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" id="staff-form-modal">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-serif text-lg font-bold text-hadero-dark mb-4">Provision Staff Login</h3>
            
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Full Name</label>
                <input
                  id="staff-form-fullname"
                  type="text"
                  placeholder="e.g. Martha Kebede"
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Username</label>
                <input
                  id="staff-form-username"
                  type="text"
                  placeholder="e.g. martha_k"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Assigned Role</label>
                  <select
                    id="staff-form-role"
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as any)}
                    className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                  >
                    <option value="waiter">Waiter (Staff)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Set Password</label>
                  <input
                    id="staff-form-password"
                    type="password"
                    placeholder="e.g. m12345"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  id="cancel-staff-save"
                  type="button"
                  onClick={() => setIsStaffFormOpen(false)}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-bold py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  id="save-staff-submit"
                  type="submit"
                  className="flex-1 bg-hadero-dark hover:bg-hadero-gold text-hadero-cream hover:text-hadero-dark text-xs font-bold py-2.5 rounded-xl"
                >
                  Create Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------
          MODAL D: CHANGE ACCOUNT PASSWORDS (ADMIN ONLY)
          -------------------------------------------------- */}
      {isPasswordFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" id="password-form-modal">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={18} className="text-hadero-gold" />
              <h3 className="font-serif text-lg font-bold text-hadero-dark">Force Staff Password Update</h3>
            </div>
            
            <p className="text-[10px] text-gray-500 mb-4 leading-normal">
              As administrator, you can force-change the login password for any staff account, including your own, without knowing the current password.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Target Username</label>
                <select
                  id="pwd-form-target"
                  value={pwdTargetUser}
                  onChange={(e) => setPwdTargetUser(e.target.value)}
                  className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                  required
                >
                  <option value="">-- Choose Account --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.username}>{s.username} ({s.fullName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">New Secure Password</label>
                <input
                  id="pwd-form-new-val"
                  type="text"
                  placeholder="e.g. newsecpass77"
                  value={pwdNewValue}
                  onChange={(e) => setPwdNewValue(e.target.value)}
                  className="w-full bg-hadero-cream border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-hadero-dark font-medium focus:outline-none focus:ring-2 focus:ring-hadero-gold"
                  required
                />
              </div>

              {pwdSuccessMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-xs p-3 rounded-lg font-bold flex items-center gap-1.5" id="pwd-success-alert">
                  <Check size={14} />
                  <span>{pwdSuccessMsg}</span>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  id="cancel-pwd-save"
                  type="button"
                  onClick={() => setIsPasswordFormOpen(false)}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-bold py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  id="save-pwd-submit"
                  type="submit"
                  className="flex-1 bg-hadero-dark hover:bg-hadero-gold text-hadero-cream hover:text-hadero-dark text-xs font-bold py-2.5 rounded-xl"
                >
                  Apply New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------
          MODAL E: SELF PASSWORD UPDATE (FLOW: current -> new -> confirm)
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
