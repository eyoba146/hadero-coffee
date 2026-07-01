import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import QRCode from "qrcode";

const DB_PATH = path.join(process.cwd(), "data", "db.json");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Ensure data directory and DB file exist
if (!fs.existsSync(path.join(process.cwd(), "data"))) {
  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
}

// Ensure public/uploads exists so we can save uploads
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper to load database
function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      const data = JSON.parse(raw);
      if (!data.staff) {
        data.staff = [];
      }
      if (!data.settings) {
        data.settings = { qrTargetUrl: "" };
      }
      
      const adminExists = data.staff.some((s: any) => s.username === "admin");
      const waiterExists = data.staff.some((s: any) => s.username === "waiter");
      
      let modified = false;
      if (!data.settings.qrTargetUrl) {
        data.settings = { qrTargetUrl: "" };
        modified = true;
      }
      if (!adminExists) {
        data.staff.push({
          id: "staff-1",
          username: "admin",
          password: "adminpassword",
          role: "admin",
          fullName: "Restaurant Admin",
          status: "active"
        });
        modified = true;
      }
      if (!waiterExists) {
        data.staff.push({
          id: "staff-2",
          username: "waiter",
          password: "waiterpassword",
          role: "waiter",
          fullName: "Staff Waiter",
          status: "active"
        });
        modified = true;
      }
      
      // Ensure all staff have a status
      data.staff.forEach((s: any) => {
        if (!s.status) {
          s.status = "active";
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
      }
      return data;
    }
  } catch (err) {
    console.error("Error reading database file, fallback to template:", err);
  }
  return {
    menu: [],
    orders: [],
    staff: [
      {
        id: "staff-1",
        username: "admin",
        password: "adminpassword",
        role: "admin",
        fullName: "Restaurant Admin",
        status: "active"
      },
      {
        id: "staff-2",
        username: "waiter",
        password: "waiterpassword",
        role: "waiter",
        fullName: "Staff Waiter",
        status: "active"
      }
    ],
    paymentAccounts: {},
    images: [],
    settings: { qrTargetUrl: "" }
  };
}

// Helper to save database
function saveDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database file:", err);
  }
}

// Multer storage configuration for local file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "menu-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsing middlewares
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // --- CUSTOM DYNAMIC SVG COFFEE GRAPHIC FALLBACK MIDDLEWARE ---
  // If an upload or placeholder file is requested but doesn't exist on disk,
  // we return a beautiful custom SVG matching the Hadero Coffee aesthetic!
  app.get("/uploads/:filename", (req, res, next) => {
    const filePath = path.join(process.cwd(), "public", "uploads", req.params.filename);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }

    // Capture the name from filename for a descriptive label
    const nameStr = req.params.filename
      .replace("placeholder_", "")
      .replace("menu-", "")
      .replace(/\.[^/.]+$/, "") // strip extension
      .replace(/[-_]/g, " ");
    
    const title = nameStr
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    // Create a beautiful modern minimalist SVG with the Hadero Coffee aesthetic
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
        <defs>
          <linearGradient id="coffeeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1F1F1F" />
            <stop offset="100%" stop-color="#2D2D1B" />
          </linearGradient>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#coffeeGrad)" />
        
        <!-- Minimal Grid Pattern background -->
        <g opacity="0.15">
          <path d="M 0,30 L 400,30 M 0,60 L 400,60 M 0,90 L 400,90 M 0,120 L 400,120 M 0,150 L 400,150 M 0,180 L 400,180 M 0,210 L 400,210 M 0,240 L 400,240 M 0,270 L 400,270" stroke="#9B9B45" stroke-width="0.5"/>
          <path d="M 40,0 L 40,300 M 80,0 L 80,300 M 120,0 L 120,300 M 160,0 L 160,300 M 200,0 L 200,300 M 240,0 L 240,300 M 280,0 L 280,300 M 320,0 L 320,300 M 360,0 L 360,300" stroke="#9B9B45" stroke-width="0.5"/>
        </g>

        <!-- Coffee Steam lines -->
        <g opacity="0.4">
          <path d="M185,110 C180,95 190,80 185,65 S195,50 190,35" fill="none" stroke="#9B9B45" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M200,110 C195,95 205,80 200,65 S210,50 205,35" fill="none" stroke="#9B9B45" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M215,110 C210,95 220,80 215,65 S225,50 220,35" fill="none" stroke="#9B9B45" stroke-width="3.5" stroke-linecap="round"/>
        </g>

        <!-- The Coffee Cup -->
        <path d="M130,120 L270,120 L245,215 C242,226 230,235 215,235 L185,235 C170,235 158,226 155,215 Z" fill="#FDFBF7" />
        <!-- Elegant Plate/Saucer under cup -->
        <path d="M120,240 L280,240 C295,240 300,248 280,248 L120,248 C100,248 105,240 120,240 Z" fill="#9B9B45" opacity="0.9" />
        
        <!-- Cup handle -->
        <path d="M260,135 C295,135 295,185 260,185" fill="none" stroke="#FDFBF7" stroke-width="12" stroke-linecap="round"/>
        
        <!-- Central Branding Circle on Cup -->
        <circle cx="200" cy="175" r="24" fill="#9B9B45" />
        <text x="200" y="181" font-family="'Inter', sans-serif" font-weight="bold" font-size="16" fill="#1F1F1F" text-anchor="middle">HADERO</text>

        <!-- Elegant text bar at bottom -->
        <rect x="0" y="260" width="400" height="40" fill="#9B9B45" />
        <text x="200" y="286" font-family="'Inter', sans-serif" font-weight="bold" font-size="14" fill="#1F1F1F" text-anchor="middle" letter-spacing="1">${title.toUpperCase()}</text>
      </svg>
    `;
    res.setHeader("Content-Type", "image/svg+xml");
    return res.send(svg);
  });

  // Serve uploads folder as static files
  app.use("/uploads", express.static(UPLOADS_DIR));

  // --------------------------------------------------
  // REST API ENDPOINTS
  // --------------------------------------------------

  // 1. Auth Endpoint: Staff Login
  app.post("/api/auth/login", (req, res) => {
    const { username, password, isQuickLogin } = req.body;
    const db = loadDb();
    
    let staffMember;
    if (isQuickLogin && username === "waiter") {
      staffMember = db.staff.find((s: any) => s.username === "waiter");
    } else {
      staffMember = db.staff.find(
        (s: any) => s.username === username && s.password === password
      );
    }

    if (staffMember) {
      if (staffMember.status === "revoked") {
        return res.status(403).json({ success: false, message: "Access has been revoked by the administrator." });
      }
      return res.json({
        success: true,
        user: {
          id: staffMember.id,
          username: staffMember.username,
          role: staffMember.role,
          fullName: staffMember.fullName || staffMember.username,
          status: staffMember.status || "active"
        }
      });
    }

    return res.status(401).json({ success: false, message: "Invalid username or password" });
  });

  // 1b. Check status endpoint
  app.get("/api/staff/check-status/:username", (req, res) => {
    const { username } = req.params;
    const db = loadDb();
    const staffMember = db.staff.find((s: any) => s.username === username);
    if (!staffMember) {
      return res.json({ status: "not_found" });
    }
    return res.json({ status: staffMember.status || "active" });
  });

  // 2. Auth Endpoint: Change password (Admin can change passwords for all staff)
  app.post("/api/auth/change-password", (req, res) => {
    const { targetUsername, newPassword, adminUsername } = req.body;
    const db = loadDb();

    // Verify requesting admin exists and is admin
    const adminUser = db.staff.find(
      (s: any) => s.username === adminUsername && s.role === "admin"
    );

    if (!adminUser) {
      return res.status(403).json({ success: false, message: "Unauthorized admin access." });
    }

    // Find the target user
    const targetStaff = db.staff.find((s: any) => s.username === targetUsername);
    if (!targetStaff) {
      return res.status(404).json({ success: false, message: "Staff user not found." });
    }

    // Update password
    targetStaff.password = newPassword;
    saveDb(db);

    return res.json({ success: true, message: `Successfully updated password for ${targetUsername}` });
  });

  // 2b. Auth Endpoint: Self-Change Password (flow: current password -> new password)
  app.post("/api/auth/self-change-password", (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    const db = loadDb();

    const staffMember = db.staff.find((s: any) => s.username === username);
    if (!staffMember) {
      return res.status(404).json({ success: false, message: "Staff user not found." });
    }

    if (staffMember.password !== currentPassword) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    staffMember.password = newPassword;
    saveDb(db);

    return res.json({ success: true, message: "Password successfully changed!" });
  });

  // 3. Menu Endpoint: Get complete menu
  app.get("/api/menu", (req, res) => {
    const db = loadDb();
    return res.json(db.menu);
  });

  // 4. Menu Endpoint: Add menu item
  app.post("/api/menu", (req, res) => {
    const newItem = req.body; // shape: { name, category, price, description, image, available }
    const db = loadDb();

    const menuId = "menu-" + Date.now();
    const item = {
      id: menuId,
      name: newItem.name || "Unnamed Item",
      category: newItem.category || "Drinks",
      price: Number(newItem.price) || 0,
      description: newItem.description || "",
      image: newItem.image || "/uploads/placeholder_macchiato.jpg",
      available: newItem.available !== false
    };

    db.menu.push(item);
    saveDb(db);

    return res.json({ success: true, item });
  });

  // 5. Menu Endpoint: Update menu item
  app.put("/api/menu/:id", (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const db = loadDb();

    const idx = db.menu.findIndex((m: any) => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }

    db.menu[idx] = {
      ...db.menu[idx],
      name: updatedData.name ?? db.menu[idx].name,
      category: updatedData.category ?? db.menu[idx].category,
      price: updatedData.price !== undefined ? Number(updatedData.price) : db.menu[idx].price,
      description: updatedData.description ?? db.menu[idx].description,
      image: updatedData.image ?? db.menu[idx].image,
      available: updatedData.available ?? db.menu[idx].available
    };

    saveDb(db);
    return res.json({ success: true, item: db.menu[idx] });
  });

  // 6. Menu Endpoint: Delete menu item
  app.delete("/api/menu/:id", (req, res) => {
    const { id } = req.params;
    const db = loadDb();

    const originalLength = db.menu.length;
    db.menu = db.menu.filter((m: any) => m.id !== id);

    if (db.menu.length === originalLength) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }

    saveDb(db);
    return res.json({ success: true, message: "Menu item deleted successfully" });
  });

  // 7. Staff Management: Get staff list
  app.get("/api/staff", (req, res) => {
    const db = loadDb();
    // Exclude password from listing for security
    const sanitizedStaff = db.staff.map((s: any) => ({
      id: s.id,
      username: s.username,
      role: s.role,
      fullName: s.fullName || s.username,
      status: s.status || "active"
    }));
    return res.json(sanitizedStaff);
  });

  // 8. Staff Management: Create staff account
  app.post("/api/staff", (req, res) => {
    const { username, password, role, fullName } = req.body;
    const db = loadDb();

    if (db.staff.find((s: any) => s.username === username)) {
      return res.status(400).json({ success: false, message: "Username already exists" });
    }

    const newStaff = {
      id: "staff-" + Date.now(),
      username,
      password: password || "staff123",
      role: role || "waiter",
      fullName: fullName || username,
      status: "active"
    };

    db.staff.push(newStaff);
    saveDb(db);

    return res.json({
      success: true,
      staff: {
        id: newStaff.id,
        username: newStaff.username,
        role: newStaff.role,
        fullName: newStaff.fullName,
        status: newStaff.status
      }
    });
  });

  // 8b. Staff Management: Toggle staff account active/revoked status
  app.post("/api/staff/:id/toggle-status", (req, res) => {
    const { id } = req.params;
    const db = loadDb();

    const staffMember = db.staff.find((s: any) => s.id === id);
    if (!staffMember) {
      return res.status(404).json({ success: false, message: "Staff account not found" });
    }

    if (staffMember.username === "admin") {
      return res.status(400).json({ success: false, message: "Cannot revoke or disable the master administrator account!" });
    }

    staffMember.status = staffMember.status === "revoked" ? "active" : "revoked";
    saveDb(db);

    return res.json({ 
      success: true, 
      message: `Staff account status for "${staffMember.username}" changed to ${staffMember.status}`, 
      status: staffMember.status 
    });
  });

  // 9. Staff Management: Delete staff account
  app.delete("/api/staff/:id", (req, res) => {
    const { id } = req.params;
    const db = loadDb();

    const staffMember = db.staff.find((s: any) => s.id === id);
    if (!staffMember) {
      return res.status(404).json({ success: false, message: "Staff account not found" });
    }

    if (staffMember.username === "waiter" || staffMember.username === "admin") {
      return res.status(400).json({ success: false, message: "Cannot delete master accounts. Please use 'Revoke Access' instead to suspend access." });
    }

    const originalLength = db.staff.length;
    db.staff = db.staff.filter((s: any) => s.id !== id);

    if (db.staff.length === originalLength) {
      return res.status(404).json({ success: false, message: "Staff account not found" });
    }

    saveDb(db);
    return res.json({ success: true, message: "Staff account deleted successfully" });
  });

  // 10. Orders: Get active orders
  app.get("/api/orders", (req, res) => {
    const db = loadDb();
    // Sort orders by most recent
    const sorted = [...db.orders].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return res.json(sorted);
  });

  // 11. Orders: Place new order (Customer)
  app.post("/api/orders", (req, res) => {
    const { table, items, paymentMethod } = req.body;
    const db = loadDb();

    if (!table || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Table number and ordered items are required." });
    }

    // Generate a beautiful visual invoice code: HD- followed by random 3 digits (e.g. HD-294)
    const orderNum = "HD-" + Math.floor(100 + Math.random() * 900);
    
    // Check for item matches from menu database to get correct names/prices and calculate total
    let computedTotal = 0;
    const orderItems = items.map((cartItem: any) => {
      const dbItem = db.menu.find((m: any) => m.id === cartItem.id);
      const name = dbItem ? dbItem.name : cartItem.name || "Item";
      const price = dbItem ? dbItem.price : Number(cartItem.price) || 0;
      const qty = Number(cartItem.quantity) || 1;
      computedTotal += price * qty;
      return {
        id: cartItem.id,
        name,
        price,
        quantity: qty
      };
    });

    const newOrder = {
      id: orderNum,
      table: String(table),
      items: orderItems,
      total: computedTotal,
      paymentMethod: paymentMethod || "Cash",
      status: "Pending", // initial state
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.orders.push(newOrder);
    saveDb(db);

    return res.json({ success: true, order: newOrder });
  });

  // 12. Orders: Get single order status (Order Tracking)
  app.get("/api/orders/:id", (req, res) => {
    const { id } = req.params;
    const db = loadDb();

    const order = db.orders.find((o: any) => o.id.toLowerCase() === id.toLowerCase());
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.json(order);
  });

  // 13. Orders: Update status
  app.patch("/api/orders/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'Pending' | 'Cooking' | 'Served' | 'Completed'
    const db = loadDb();

    const order = db.orders.find((o: any) => o.id.toLowerCase() === id.toLowerCase());
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const allowedStatuses = ["Pending", "Cooking", "Served", "Completed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status state" });
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
    saveDb(db);

    return res.json({ success: true, order });
  });

  // 14. Upload: Handle file upload via local file input
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const db = loadDb();

    // Store in historical uploads gallery
    if (!db.images) db.images = [];
    db.images.push(fileUrl);
    saveDb(db);

    return res.json({ success: true, imageUrl: fileUrl });
  });

  // 15. Upload: Handle Base64 photo capture from camera API
  app.post("/api/upload-base64", (req, res) => {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ success: false, message: "No image data provided" });
    }

    try {
      // Strip metadata prefix if exists (e.g. data:image/jpeg;base64,)
      const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let ext = ".jpg";

      if (matches && matches.length === 3) {
        const type = matches[1];
        if (type.includes("png")) ext = ".png";
        buffer = Buffer.from(matches[2], "base64");
      } else {
        buffer = Buffer.from(base64Image, "base64");
      }

      const filename = `camera-${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);

      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${filename}`;
      const db = loadDb();

      if (!db.images) db.images = [];
      db.images.push(fileUrl);
      saveDb(db);

      return res.json({ success: true, imageUrl: fileUrl });
    } catch (error: any) {
      console.error("Failed to save base64 image:", error);
      return res.status(500).json({ success: false, message: "Failed to save captured image" });
    }
  });

  // 16. Get all previously uploaded images (image gallery reuse)
  app.get("/api/images", (req, res) => {
    const db = loadDb();
    // Make sure db.images is populated
    if (!db.images || db.images.length === 0) {
      const defaultImages = db.menu.map((m: any) => m.image).filter(Boolean);
      db.images = Array.from(new Set(defaultImages));
      saveDb(db);
    }
    return res.json(db.images);
  });

  // 17. Retrieve Payment Methods and Account details
  app.get("/api/payment-accounts", (req, res) => {
    const db = loadDb();
    return res.json(db.paymentAccounts);
  });

  // 18. Retrieve global settings (like dynamic QR target URL)
  app.get("/api/settings", (req, res) => {
    const db = loadDb();
    const defaultUrl = `${req.protocol}://${req.get("host")}/`;
    const qrTargetUrl = db.settings?.qrTargetUrl || defaultUrl;
    return res.json({ qrTargetUrl });
  });

  // 19. Server-side proxy for downloading the Hadero Coffee Menu QR image (pure Node, offline-first)
  app.get("/api/settings/download-qr", async (req, res) => {
    const db = loadDb();
    const defaultUrl = `${req.protocol}://${req.get("host")}/`;
    const targetUrl = db.settings?.qrTargetUrl || defaultUrl;

    try {
      const buffer = await QRCode.toBuffer(targetUrl, {
        width: 600,
        margin: 2,
        errorCorrectionLevel: "H",
        color: {
          dark: "#1F1F1F",
          light: "#FFFFFF"
        }
      });
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", "attachment; filename=hadero_coffee_menu_qr.png");
      return res.send(buffer);
    } catch (err) {
      console.error("Error generating QR on server:", err);
      return res.status(500).json({ success: false, message: "Failed to generate QR image." });
    }
  });

  // 19.1 endpoint to get live QR image as an image response (highly reliable)
  app.get("/api/settings/qr-image", async (req, res) => {
    const db = loadDb();
    const defaultUrl = `${req.protocol}://${req.get("host")}/`;
    const targetUrl = db.settings?.qrTargetUrl || defaultUrl;

    try {
      const buffer = await QRCode.toBuffer(targetUrl, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: "Q"
      });
      res.setHeader("Content-Type", "image/png");
      return res.send(buffer);
    } catch (err) {
      console.error("Error rendering QR image:", err);
      return res.status(500).json({ success: false, message: "Error rendering QR code." });
    }
  });

  // 20. Update global settings with strict security parameters validation and auto-cleaning
  app.post("/api/settings", (req, res) => {
    const { qrTargetUrl } = req.body;
    if (!qrTargetUrl || typeof qrTargetUrl !== "string") {
      return res.status(400).json({ success: false, message: "A valid QR Target URL string is required." });
    }

    let trimmedUrl = qrTargetUrl.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      trimmedUrl = "http://" + trimmedUrl;
    }

    let cleanedUrl = trimmedUrl;
    try {
      const urlObj = new URL(trimmedUrl);
      
      // Remove query parameters like staff, portal, login, admin, waiter
      const paramsToRemove = ["staff", "portal", "login", "admin", "waiter"];
      paramsToRemove.forEach((param) => {
        urlObj.searchParams.delete(param);
      });
      
      // Clean pathname: split by "/" and filter out staff-related path segments
      const segments = urlObj.pathname.split("/");
      const cleanSegments = segments.filter((seg) => {
        const lower = seg.toLowerCase();
        return lower !== "staff" && lower !== "portal" && lower !== "login" && lower !== "admin" && lower !== "waiter";
      });
      urlObj.pathname = cleanSegments.join("/") || "/";
      
      cleanedUrl = urlObj.toString();
    } catch (e) {
      // Basic fallback cleaning if URL parsing fails
      cleanedUrl = trimmedUrl
        .replace(/[\?&](portal|staff|login|admin|waiter)(=?[^&]*)/gi, "")
        .replace(/\/(staff|portal|login|admin|waiter)\b/gi, "");
    }

    const db = loadDb();
    db.settings = {
      ...db.settings,
      qrTargetUrl: cleanedUrl
    };
    saveDb(db);

    return res.json({ 
      success: true, 
      message: "QR target URL cleaned and updated successfully!", 
      qrTargetUrl: cleanedUrl 
    });
  });

  // --------------------------------------------------
  // VITE OR STATIC MIDDLEWARE SETUP
  // --------------------------------------------------

  if (process.env.NODE_ENV !== "production") {
    // Vite Dev Middleware integration
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hadero Coffee System running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
