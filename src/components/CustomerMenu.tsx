import React, { useState, useEffect } from "react";
import { MenuItem, CartItem, PaymentAccounts } from "../types";
import { ShoppingBag, Search, Plus, Minus, Copy, Check, Info, Phone, CreditCard, ArrowRight, Star, MapPin, Sparkles, Leaf, Flame, Instagram, Facebook, Twitter, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CustomerMenuProps {
  tableNumber: string | null;
  onSelectTable: (table: string) => void;
  onOrderPlaced: (orderId: string) => void;
}

export default function CustomerMenu({ tableNumber, onSelectTable, onOrderPlaced }: CustomerMenuProps) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(["All", "Drinks", "Foods"]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [tempTable, setTempTable] = useState<string>("");
  
  // Checkout fields
  const [paymentMethod, setPaymentMethod] = useState<"CBE" | "CBE Birr" | "Telebirr" | "Cash">("Telebirr");
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccounts | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isOrdering, setIsOrdering] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Luxury menu enhancements
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [detailQuantity, setDetailQuantity] = useState<number>(1);
  const [dietaryFilter, setDietaryFilter] = useState<"All" | "Signature" | "Vegetarian" | "Spicy">("All");

  const getItemDetails = (item: MenuItem) => {
    const isCoffee = item.category === "Drinks" && !item.name.toLowerCase().includes("tea");
    let origin = isCoffee ? "Ethiopian Highlands" : "Fresh Bakery";
    let roast = "";
    let flavorNotes = "";
    let caffeine = "Medium";
    let badges: string[] = [];
    let isVegetarian = false;
    let isSpicy = false;
    let isSignature = false;

    const lowerName = item.name.toLowerCase();

    if (lowerName.includes("jebena")) {
      origin = "Sidama Single Origin";
      roast = "Dark Roast";
      flavorNotes = "Spiced, Earthy, Rich Dark Chocolate";
      caffeine = "High";
      badges = ["Signature", "Traditional"];
      isSignature = true;
    } else if (lowerName.includes("macchiato")) {
      origin = "Yirgacheffe Arabica";
      roast = "Medium-Dark Roast";
      flavorNotes = "Sweet citrus, Jasmine, Creamy chocolate";
      caffeine = "Medium";
      badges = ["Barista Special"];
      isSignature = true;
    } else if (lowerName.includes("cold brew")) {
      origin = "Limu Arabica";
      roast = "Medium Roast";
      flavorNotes = "Smooth, floral, low acidity, vanilla caramel";
      caffeine = "Very High";
      badges = ["Refreshing", "Cold Steeped"];
    } else if (lowerName.includes("latte")) {
      origin = "Hadero House Blend";
      roast = "Medium Roast";
      flavorNotes = "Sweet caramel, buttery creaminess";
      caffeine = "Medium";
      badges = ["Classic Brew"];
    } else if (lowerName.includes("cake")) {
      origin = "Hadero Bakery";
      flavorNotes = "Rich espresso ribbon, sweet brown sugar, walnuts";
      badges = ["Freshly Baked", "Staff Choice"];
      isVegetarian = true;
    } else if (lowerName.includes("sambusa")) {
      origin = "House Kitchen";
      flavorNotes = "Savory minced beef, green pepper, crispy crust";
      badges = ["Crispy Starter"];
      isSpicy = true;
    } else if (lowerName.includes("sandwich")) {
      origin = "House Kitchen";
      flavorNotes = "Juicy roasted chicken, fresh butter avocado, mustard aioli";
      badges = ["Chef Special"];
    } else {
      if (item.category === "Drinks") {
        origin = "Ethiopian Organic Arabica";
        roast = "Medium Roast";
        flavorNotes = "Fruity undertones, crisp cocoa finish";
        badges = ["100% Arabica"];
      } else {
        origin = "Freshly Crafted Daily";
        flavorNotes = "Savory spices and fresh ingredients";
        badges = ["Handcrafted"];
        isVegetarian = true;
      }
    }

    return { origin, roast, flavorNotes, caffeine, badges, isVegetarian, isSpicy, isSignature };
  };

  const handleAddToCartWithQuantity = (item: MenuItem, qty: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: qty, category: item.category }];
    });
  };

  // Fetch menu and payment accounts
  useEffect(() => {
    fetch("/api/menu")
      .then((res) => res.json())
      .then((data) => {
        setMenu(data);
        const uniqCats = Array.from(new Set(data.map((item: MenuItem) => item.category))) as string[];
        const sortedCats = uniqCats.filter(Boolean).sort();
        setCategories(["All", ...sortedCats]);
      })
      .catch((err) => console.error("Error fetching menu:", err));

    fetch("/api/payment-accounts")
      .then((res) => res.json())
      .then((data) => setPaymentAccounts(data))
      .catch((err) => console.error("Error fetching payment accounts:", err));
  }, []);

  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, category: item.category }];
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i));
      }
      return prev.filter((i) => i.id !== itemId);
    });
  };

  const handleClearCart = () => setCart([]);

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber) {
      setErrorMsg("Please select a table number first.");
      return;
    }
    if (cart.length === 0) {
      setErrorMsg("Your cart is empty.");
      return;
    }

    setIsOrdering(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: tableNumber,
          items: cart.map((i) => ({ id: i.id, quantity: i.quantity })),
          paymentMethod,
        }),
      });

      const result = await response.json();
      if (result.success && result.order) {
        handleClearCart();
        setIsCartOpen(false);
        onOrderPlaced(result.order.id);
      } else {
        setErrorMsg(result.message || "Failed to place order.");
      }
    } catch (err) {
      console.error("Order error:", err);
      setErrorMsg("Connection error. Please try again.");
    } finally {
      setIsOrdering(false);
    }
  };

  const filteredMenu = menu.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const details = getItemDetails(item);
    let matchesDietary = true;
    if (dietaryFilter === "Signature") {
      matchesDietary = details.isSignature;
    } else if (dietaryFilter === "Vegetarian") {
      matchesDietary = details.isVegetarian;
    } else if (dietaryFilter === "Spicy") {
      matchesDietary = details.isSpicy;
    }

    return matchesCategory && matchesSearch && matchesDietary && item.available;
  });

  // If table is not assigned, render Table Selector
  if (!tableNumber) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4" id="table-selector-view">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-[#1F1F1F] p-8 rounded-3xl shadow-xl max-w-md w-full"
        >
          <div className="text-center mb-6">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-hadero-dark mb-2">Hadero Coffee</h1>
            <p className="text-sm text-gray-500 font-serif italic">Welcome! Please enter your table number to view our digital menu and start ordering.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (tempTable) onSelectTable(tempTable); }} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Table Number</label>
              <input
                id="table-input"
                type="number"
                min="1"
                max="50"
                placeholder="e.g. 5"
                value={tempTable}
                onChange={(e) => setTempTable(e.target.value)}
                className="w-full bg-hadero-cream border border-[#9B9B45]/35 text-hadero-dark rounded-2xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-hadero-gold text-lg text-center font-bold font-serif"
                required
              />
            </div>

            <button
              id="confirm-table-btn"
              type="submit"
              className="w-full bg-[#1F1F1F] text-white hover:bg-[#9B9B45] transition-colors duration-300 rounded-full py-3.5 text-[10px] uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2"
            >
              Enter Menu <ArrowRight size={14} />
            </button>
          </form>

          <div className="mt-8 border-t border-gray-100 pt-6 text-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-3 font-bold">Waiters or Admin?</span>
            <span className="text-[10px] text-hadero-gold font-bold uppercase tracking-widest bg-hadero-cream border border-[#9B9B45]/20 px-4 py-2.5 rounded-full inline-block">
              Access the staff portal in the header
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-6xl mx-auto px-4 py-6"
      id="digital-menu-view"
    >
      {/* Menu Header / Welcome banner */}
      <div className="mb-6 sm:mb-8 bg-white border border-hadero-gold/20 text-hadero-dark p-5 sm:p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative z-10">
          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.2em] text-hadero-gold bg-hadero-gold/10 px-2.5 py-1 rounded-full border border-hadero-gold/20">
            Hadero Restaurant
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-black mt-2 sm:mt-3 tracking-tight">Crafted Coffee Excellence</h1>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-1 sm:mt-1.5 max-w-md font-serif italic">Every bean roasted to perfection. Order directly from your table.</p>
        </div>
        <div className="bg-hadero-dark text-hadero-cream font-serif font-bold text-base sm:text-lg md:text-xl px-4 py-2.5 sm:px-6 sm:py-4 rounded-2xl shadow-sm border border-hadero-gold/20 z-10 self-stretch md:self-auto text-center flex flex-col justify-center min-w-[120px] sm:min-w-[140px]">
          <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] opacity-60 block font-sans font-semibold mb-0.5">Your Location</span>
          <span className="text-base sm:text-xl">Table {tableNumber}</span>
        </div>
        {/* Subtle decorative elements */}
        <div className="absolute right-0 bottom-0 w-48 h-48 bg-hadero-gold/5 rounded-full -mr-12 -mb-12 pointer-events-none" />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Categories Tabs with Fades on mobile */}
        <div className="relative flex-1 max-w-full overflow-hidden">
          {/* Left Fade Overlay */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-hadero-cream via-hadero-cream/70 to-transparent pointer-events-none z-10 md:hidden" />
          
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none px-4 md:px-0">
            {categories.map((cat) => (
              <button
                id={`cat-btn-${cat}`}
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 sm:px-6 sm:py-3 rounded-full font-bold text-[10px] uppercase tracking-[0.15em] transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-hadero-gold text-white shadow-md scale-102"
                    : "bg-white border border-hadero-gold/20 text-gray-600 hover:bg-hadero-cream"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Right Fade Overlay */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-hadero-cream via-hadero-cream/70 to-transparent pointer-events-none z-10 md:hidden" />
        </div>

        {/* Search */}
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            id="menu-search-input"
            type="text"
            placeholder="Search our delicious coffee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#9B9B45]/20 rounded-full pl-10 pr-4 py-2.5 text-xs text-hadero-dark placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-hadero-gold shadow-xs"
          />
        </div>
      </div>



      {/* Menu Item Grid */}
      {filteredMenu.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#9B9B45]/15" id="no-items-found">
          <Search size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-serif italic text-sm">No items found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" id="menu-items-grid">
          {filteredMenu.map((item) => {
            const details = getItemDetails(item);
            return (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ 
                  y: -8, 
                  scale: 1.015,
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.08)"
                }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="bg-white border border-hadero-gold/15 rounded-[2.25rem] overflow-hidden shadow-md flex flex-col h-full group relative"
                id={`menu-item-card-${item.id}`}
              >
                {/* Clickable Image & Info overlay */}
                <div 
                  className="h-48 w-full bg-hadero-dark overflow-hidden relative cursor-pointer"
                  onClick={() => { setSelectedItem(item); setDetailQuantity(1); }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Category Pill */}
                  <span className="absolute top-3 left-3 bg-hadero-dark/85 backdrop-blur-xs text-white text-[8px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-white/10">
                    {item.category}
                  </span>

                  {/* Culinary origin pill */}
                  <span className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs text-[8px] font-extrabold uppercase tracking-widest text-hadero-gold px-2.5 py-1 rounded-full border border-hadero-gold/15 flex items-center gap-1 shadow-xs">
                    <MapPin size={9} className="text-hadero-gold" />
                    <span>{details.origin}</span>
                  </span>

                  {/* Highlight Badges (e.g. Signature or Vegan) */}
                  {details.badges.length > 0 && (
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                      {details.badges.map((badge, bIdx) => {
                        const isSig = badge.toLowerCase().includes("signature") || badge.toLowerCase().includes("chef") || badge.toLowerCase().includes("staff");
                        return (
                          <span 
                            key={bIdx} 
                            className={`text-[8px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 border ${
                              isSig 
                                ? "bg-amber-500 text-white border-amber-400" 
                                : "bg-hadero-gold text-white border-hadero-gold"
                            }`}
                          >
                            {isSig ? <Sparkles size={8} /> : <Leaf size={8} />}
                            <span>{badge}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Hover Quick View Overlay */}
                  <div className="absolute inset-0 bg-hadero-dark/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                    <span className="bg-hadero-cream text-hadero-dark px-4.5 py-2.5 text-[9px] uppercase tracking-widest font-extrabold rounded-full flex items-center gap-1.5 shadow-md border border-hadero-gold/30">
                      <Info size={11} className="text-hadero-gold" />
                      Explore Details
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div 
                    className="cursor-pointer"
                    onClick={() => { setSelectedItem(item); setDetailQuantity(1); }}
                  >
                    <div className="flex justify-between items-center mb-2 gap-2">
                      <h3 className="font-serif text-base font-extrabold text-hadero-dark group-hover:text-hadero-gold transition-colors line-clamp-1">{item.name}</h3>
                      <span className="text-[9px] font-mono text-amber-600 font-bold shrink-0 bg-amber-50/80 px-2 py-0.5 rounded-full border border-amber-200/40 flex items-center gap-0.5">
                        <Star size={9} className="text-amber-500 fill-amber-500" />
                        <span>4.9</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4 min-h-[32px] font-sans leading-relaxed">{item.description}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest">Pricing</span>
                      <span className="font-bold text-base text-hadero-dark font-serif">
                        {item.price} <span className="text-[9px] font-sans font-semibold text-gray-500 uppercase tracking-wider">ETB</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedItem(item); setDetailQuantity(1); }}
                        className="bg-hadero-cream text-hadero-gold hover:bg-hadero-gold hover:text-white transition-all p-2.5 rounded-full flex items-center justify-center cursor-pointer border border-hadero-gold/10"
                        title="View recipe details"
                      >
                        <Info size={13} />
                      </button>
                      <button
                        id={`add-to-cart-btn-${item.id}`}
                        onClick={() => handleAddToCart(item)}
                        className="bg-hadero-dark text-white hover:bg-hadero-gold hover:text-hadero-dark transition-all p-2.5 rounded-full flex items-center justify-center shadow-md cursor-pointer"
                        title="Quick Add to Order"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Social Media & Footer Section */}
      <div className="mt-16 border-t border-hadero-gold/15 pt-10 pb-8 text-center" id="customer-footer">
        <p className="font-serif text-sm font-bold text-hadero-dark tracking-wide uppercase">Connect with Hadero</p>
        <p className="text-[11px] text-gray-500 font-serif italic mt-1 mb-6">Stay updated on our premium roasts, events, and masterclasses</p>
        
        <div className="flex items-center justify-center gap-4.5 mb-8">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-white border border-hadero-gold/20 rounded-full text-hadero-dark hover:bg-hadero-gold hover:text-white transition-all duration-300 shadow-xs flex items-center justify-center cursor-pointer hover:scale-110"
            title="Instagram"
          >
            <Instagram size={18} />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-white border border-hadero-gold/20 rounded-full text-hadero-dark hover:bg-hadero-gold hover:text-white transition-all duration-300 shadow-xs flex items-center justify-center cursor-pointer hover:scale-110"
            title="Facebook"
          >
            <Facebook size={18} />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-white border border-hadero-gold/20 rounded-full text-hadero-dark hover:bg-hadero-gold hover:text-white transition-all duration-300 shadow-xs flex items-center justify-center cursor-pointer hover:scale-110"
            title="Twitter"
          >
            <Twitter size={18} />
          </a>
          <a
            href="https://t.me"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-white border border-hadero-gold/20 rounded-full text-hadero-dark hover:bg-hadero-gold hover:text-white transition-all duration-300 shadow-xs flex items-center justify-center cursor-pointer hover:scale-110"
            title="Telegram Channel"
          >
            <Send size={18} />
          </a>
        </div>

        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
          © {new Date().getFullYear()} HADERO COFFEE ROASTERS. ALL RIGHTS RESERVED.
        </p>
      </div>

      {/* Persistent Floating Shopping Cart Button */}
      {getCartCount() > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <motion.button
            id="floating-cart-btn"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setIsCartOpen(true)}
            className="bg-hadero-dark text-hadero-cream hover:bg-hadero-gold hover:text-hadero-dark px-6 py-4 rounded-full shadow-lg flex items-center gap-3 text-xs uppercase tracking-[0.15em] font-bold transition-all border border-hadero-gold/30 cursor-pointer"
          >
            <div className="relative">
              <ShoppingBag size={18} />
              <span className="absolute -top-2.5 -right-2.5 bg-hadero-gold text-white border border-hadero-dark w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold">
                {getCartCount()}
              </span>
            </div>
            <span>View Cart</span>
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs border border-white/10 font-bold ml-1 font-mono">
              {getCartTotal()} ETB
            </span>
          </motion.button>
        </div>
      )}

      {/* Cart Drawer / Modal Checkout */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end" id="cart-drawer-backdrop">
            {/* Backdrop cover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black"
            />

            {/* Drawer Body */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-hadero-cream h-full shadow-2xl flex flex-col border-l border-hadero-gold/30"
              id="cart-drawer-body"
            >
              {/* Header */}
              <div className="p-6 bg-hadero-dark text-hadero-cream flex items-center justify-between border-b border-hadero-gold/30">
                <div>
                  <h2 className="font-serif text-xl font-bold italic tracking-tight">Your Table Order</h2>
                  <p className="text-xs text-hadero-gold font-serif italic">Table {tableNumber}</p>
                </div>
                <button
                  id="close-cart-btn"
                  onClick={() => setIsCartOpen(false)}
                  className="text-gray-400 hover:text-hadero-cream transition-colors text-[10px] font-bold uppercase tracking-wider border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-full cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <ShoppingBag size={48} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 font-serif italic">Your cart is currently empty.</p>
                    <button
                      id="back-to-menu-btn"
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 text-xs font-bold uppercase tracking-widest text-hadero-gold hover:underline cursor-pointer"
                    >
                      Browse Digital Menu
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Selected Items</span>
                      <button
                        id="clear-cart-btn"
                        onClick={handleClearCart}
                        className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>

                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-hadero-gold/10 shadow-2xs"
                        id={`cart-item-${item.id}`}
                      >
                        <div>
                          <h4 className="font-serif font-bold text-hadero-dark text-xs sm:text-sm">{item.name}</h4>
                          <span className="text-[10px] sm:text-xs text-gray-500 font-medium">{item.price} ETB each</span>
                        </div>

                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <button
                            id={`qty-minus-${item.id}`}
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="bg-hadero-cream border border-gray-200 hover:border-hadero-gold hover:bg-white text-hadero-dark p-1.5 sm:p-2 rounded-full transition-all cursor-pointer flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="font-bold text-xs sm:text-sm w-4 text-center font-serif">{item.quantity}</span>
                          <button
                            id={`qty-plus-${item.id}`}
                            onClick={() => handleAddToCart({ id: item.id, name: item.name, price: item.price } as MenuItem)}
                            className="bg-hadero-cream border border-gray-200 hover:border-hadero-gold hover:bg-white text-hadero-dark p-1.5 sm:p-2 rounded-full transition-all cursor-pointer flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8"
                          >
                            <Plus size={11} />
                          </button>
                          <span className="font-bold text-xs ml-1 sm:ml-2 text-right min-w-[50px] sm:min-w-[55px] font-serif">
                            {item.price * item.quantity} ETB
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Checkout Form & Payment Copy Area inside scrollable view */}
                    <div className="border-t border-gray-200 pt-5 mt-5 space-y-3">
                      {/* Select Payment Method */}
                      <div>
                        <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                          Payment Option (Copy Account &amp; Pay)
                        </label>
                        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                          {(["Telebirr", "CBE Birr", "CBE", "Cash"] as const).map((method) => (
                            <button
                              id={`pay-method-${method.replace(" ", "-")}`}
                              key={method}
                              type="button"
                              onClick={() => setPaymentMethod(method)}
                              className={`py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] uppercase tracking-wider font-bold transition-all text-center border cursor-pointer ${
                                paymentMethod === method
                                  ? "bg-hadero-dark border-hadero-dark text-hadero-cream"
                                  : "bg-white border-hadero-gold/20 text-gray-600 hover:bg-hadero-cream"
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic Account Details Display based on Payment Method */}
                      {paymentAccounts && (
                        <div className="bg-hadero-cream border border-hadero-gold/25 rounded-2xl p-3 sm:p-4 text-xs relative overflow-hidden">
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="font-bold uppercase text-[9px] sm:text-[10px] text-hadero-dark flex items-center gap-1.5 tracking-wider">
                              <CreditCard size={12} className="text-hadero-gold" />
                              {paymentMethod === "Telebirr" && paymentAccounts.telebirr.name}
                              {paymentMethod === "CBE Birr" && paymentAccounts.cbeBirr.name}
                              {paymentMethod === "CBE" && paymentAccounts.cbe.name}
                              {paymentMethod === "Cash" && paymentAccounts.cash.name}
                            </span>
                            {paymentMethod !== "Cash" && (
                              <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-widest text-hadero-gold bg-hadero-dark px-2 py-0.5 rounded-full">
                                Direct Transfer
                              </span>
                            )}
                          </div>

                          {paymentMethod === "Cash" ? (
                            <p className="text-gray-600 leading-relaxed font-serif italic text-[10px] sm:text-xs">{paymentAccounts.cash.description}</p>
                          ) : (
                            <div className="space-y-1.5 mt-1.5">
                              <div className="flex justify-between items-center bg-white p-2.5 sm:p-3 rounded-xl border border-hadero-gold/15">
                                <div>
                                  <span className="text-[8px] sm:text-[9px] uppercase text-gray-400 block font-bold tracking-wider">
                                    {paymentMethod} Account
                                  </span>
                                  <span className="font-mono font-bold text-hadero-dark text-[11px] sm:text-xs">
                                    {paymentMethod === "Telebirr" && paymentAccounts.telebirr.accountNumber}
                                    {paymentMethod === "CBE Birr" && paymentAccounts.cbeBirr.accountNumber}
                                    {paymentMethod === "CBE" && paymentAccounts.cbe.accountNumber}
                                  </span>
                                </div>
                                <button
                                  id="copy-account-btn"
                                  type="button"
                                  onClick={() => {
                                    const acc = paymentMethod === "Telebirr" ? paymentAccounts.telebirr.accountNumber :
                                                paymentMethod === "CBE Birr" ? paymentAccounts.cbeBirr.accountNumber :
                                                paymentAccounts.cbe.accountNumber;
                                    if (acc) handleCopyText(acc, "account");
                                  }}
                                  className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border border-hadero-gold text-hadero-gold hover:bg-hadero-gold hover:text-white transition-all px-2.5 py-1 rounded-full cursor-pointer"
                                >
                                  {copiedField === "account" ? "Copied" : "Copy"}
                                </button>
                              </div>

                              {/* Merchant Code if exists */}
                              {(paymentMethod === "Telebirr" || paymentMethod === "CBE Birr") && (
                                <div className="flex justify-between items-center bg-white p-2.5 sm:p-3 rounded-xl border border-hadero-gold/15">
                                  <div>
                                    <span className="text-[8px] sm:text-[9px] uppercase text-gray-400 block font-bold tracking-wider">Merchant ID</span>
                                    <span className="font-mono font-bold text-hadero-dark text-[11px] sm:text-xs">
                                      {paymentMethod === "Telebirr" && paymentAccounts.telebirr.merchantCode}
                                      {paymentMethod === "CBE Birr" && paymentAccounts.cbeBirr.merchantCode}
                                    </span>
                                  </div>
                                  <button
                                    id="copy-merchant-btn"
                                    type="button"
                                    onClick={() => {
                                      const code = paymentMethod === "Telebirr" ? paymentAccounts.telebirr.merchantCode : paymentAccounts.cbeBirr.merchantCode;
                                      if (code) handleCopyText(code, "merchant");
                                    }}
                                    className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border border-hadero-gold text-hadero-gold hover:bg-hadero-gold hover:text-white transition-all px-2.5 py-1 rounded-full cursor-pointer"
                                  >
                                    {copiedField === "merchant" ? "Copied" : "Copy"}
                                  </button>
                                </div>
                              )}

                              <div className="text-[8px] sm:text-[9px] text-gray-500 leading-tight flex items-start gap-1">
                                <Info size={10} className="text-hadero-gold shrink-0 mt-0.5" />
                                <span>
                                  Please copy details above, pay in your wallet, and place order. Waiter will verify.
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Sticky Summary & Place Order CTA - kept simple and elegant */}
              {cart.length > 0 && (
                <div className="border-t border-gray-200 bg-white p-4 sm:p-6 shadow-xl space-y-3 shrink-0">
                  {/* Summary */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] sm:text-xs font-bold uppercase tracking-widest text-gray-400">
                      <span>Order Quantity</span>
                      <span className="font-mono font-bold text-hadero-dark">{getCartCount()} items</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base border-t border-gray-100 pt-2.5">
                      <span className="font-serif font-bold text-hadero-dark">Total Price</span>
                      <span className="font-bold text-base sm:text-lg text-hadero-dark font-serif">{getCartTotal()} ETB</span>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-[10px] sm:text-xs p-2.5 rounded-xl" id="order-error-message">
                      {errorMsg}
                    </div>
                  )}

                  {/* Place Order CTA */}
                  <button
                    id="submit-order-btn"
                    onClick={handlePlaceOrder}
                    disabled={isOrdering}
                    className="w-full bg-hadero-gold hover:bg-hadero-dark text-white hover:text-hadero-cream py-2.5 sm:py-3.5 rounded-full font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] cursor-pointer shadow-md"
                  >
                    {isOrdering ? (
                      <span>Sending Order...</span>
                    ) : (
                      <>
                        <span>Place Table Order ({getCartTotal()} ETB)</span>
                        <ArrowRight size={13} className="sm:w-3.5 sm:h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Luxury Culinary Detail Modal */}
      <AnimatePresence>
        {selectedItem && (() => {
          const details = getItemDetails(selectedItem);
          return (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" id="detail-modal-backdrop">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedItem(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              />

              {/* Modal Container */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-hadero-cream border-2 border-hadero-dark/30 rounded-3xl shadow-2xl max-w-2xl w-full relative overflow-hidden z-10 p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8"
                id="item-detail-modal"
              >
                {/* Decorative gold inner line */}
                <div className="absolute top-2 left-2 right-2 bottom-2 border border-hadero-gold/20 pointer-events-none rounded-2xl" />

                {/* Left Side: High Res Cover Image */}
                <div className="w-full md:w-1/2 relative h-56 md:h-80 rounded-2xl overflow-hidden border border-hadero-dark/10">
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 bg-hadero-dark/90 backdrop-blur-xs text-hadero-cream text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                    {selectedItem.category}
                  </span>
                  <span className="absolute bottom-3 left-3 bg-white/95 text-[9px] font-extrabold text-hadero-gold px-3 py-1.5 rounded-full shadow-sm border border-hadero-gold/15 flex items-center gap-1">
                    <MapPin size={9} className="text-hadero-gold" />
                    <span>{details.origin}</span>
                  </span>
                </div>

                {/* Right Side: Culinary description and customization */}
                <div className="w-full md:w-1/2 flex flex-col justify-between relative z-10">
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h2 className="font-serif text-2xl font-bold text-hadero-dark tracking-tight">{selectedItem.name}</h2>
                        <span className="text-[10px] text-hadero-gold font-serif italic mt-0.5 block">Ethiopian Artisanal Selection</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-600 font-bold shrink-0 bg-amber-50 border border-amber-200/50 px-2.5 py-1 rounded-full flex items-center gap-0.5 shadow-2xs">
                        <Star size={11} className="text-amber-500 fill-amber-500" />
                        <span>4.9</span>
                      </span>
                    </div>

                    {/* Tags */}
                    {details.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {details.badges.map((badge, idx) => (
                          <span key={idx} className="bg-hadero-gold/15 text-hadero-gold text-[8px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-hadero-gold/10">
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Description */}
                    <p className="text-xs text-gray-600 font-sans leading-relaxed mb-6">{selectedItem.description}</p>

                    {/* Culinary Characteristics Grid */}
                    <div className="grid grid-cols-2 gap-4 border-t border-b border-hadero-gold/15 py-4 mb-6">
                      <div>
                        <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Bean Roast</span>
                        <span className="text-xs font-serif font-bold text-hadero-dark">{details.roast || "House Fresh"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Caffeine Punch</span>
                        <span className="text-xs font-serif font-bold text-hadero-dark">{details.caffeine}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Flavor Highlights</span>
                        <span className="text-xs font-serif italic text-hadero-gold font-medium leading-relaxed">{details.flavorNotes}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity and CTA row */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-gray-500">Select Quantity</span>
                      <div className="flex items-center gap-4 bg-white border border-hadero-gold/20 p-1.5 rounded-full">
                        <button
                          onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                          className="bg-hadero-cream hover:bg-hadero-dark hover:text-white p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center w-8 h-8"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-serif font-bold text-base text-hadero-dark w-6 text-center">{detailQuantity}</span>
                        <button
                          onClick={() => setDetailQuantity(detailQuantity + 1)}
                          className="bg-hadero-cream hover:bg-hadero-dark hover:text-white p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center w-8 h-8"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedItem(null)}
                        className="w-1/3 border border-hadero-dark text-hadero-dark hover:bg-hadero-dark hover:text-hadero-cream transition-all py-3.5 rounded-full font-bold text-[10px] uppercase tracking-wider text-center cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        id="modal-add-to-cart-btn"
                        onClick={() => {
                          handleAddToCartWithQuantity(selectedItem, detailQuantity);
                          setSelectedItem(null);
                        }}
                        className="w-2/3 bg-hadero-dark text-white hover:bg-hadero-gold hover:text-hadero-dark transition-all py-3.5 rounded-full font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-md cursor-pointer animate-none"
                      >
                        <span>Add To Order</span>
                        <span className="bg-white/15 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                          {selectedItem.price * detailQuantity} ETB
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
