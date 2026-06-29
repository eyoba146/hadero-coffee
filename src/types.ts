export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  available: boolean;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

export interface Order {
  id: string; // e.g. HD-294
  table: string;
  items: CartItem[];
  total: number;
  paymentMethod: "CBE" | "CBE Birr" | "Telebirr" | "Cash";
  status: "Pending" | "Cooking" | "Served" | "Completed";
  createdAt: string;
  updatedAt: string;
}

export interface Staff {
  id: string;
  username: string;
  role: "admin" | "waiter";
  fullName: string;
  status?: "active" | "revoked";
}

export interface PaymentAccountDetails {
  name: string;
  accountNumber?: string;
  merchantCode?: string;
  holder?: string;
  description?: string;
}

export interface PaymentAccounts {
  cbe: PaymentAccountDetails;
  cbeBirr: PaymentAccountDetails;
  telebirr: PaymentAccountDetails;
  cash: PaymentAccountDetails;
}
