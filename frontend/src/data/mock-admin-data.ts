import { products } from "./products";

// Helper to generate dates
const subDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

// 1. Mock Orders
export type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED" | "RETOUR";

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  total: number;
  status: OrderStatus;
  returnReason?: string;
  createdAt: string;
  updatedAt?: string;
  items: {
    id: string;
    productId: string;
    quantity: number;
    price: number;
    product?: {
      name: string;
      image: string;
    };
  }[];
}

export const mockOrders: Order[] = Array.from({ length: 50 }).map((_, i) => {
  const statuses: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "DELIVERED", "DELIVERED"];
  const cities = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"];
  const randomProduct = products[Math.floor(Math.random() * products.length)];
  const id = `ORD-${1000 + i}`;

  return {
    id: id,
    orderNumber: id,
    customerName: `Client ${i + 1}`,
    phone: `+212 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
    city: cities[Math.floor(Math.random() * cities.length)],
    address: `Rue ${i + 1}, Quartier Example`,
    total: randomProduct.price,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    createdAt: subDays(new Date(), Math.floor(Math.random() * 30)).toISOString(),
    items: [
      {
        id: `ITEM-${i}-1`,
        productId: randomProduct.id,
        quantity: 1,
        price: randomProduct.price,
        product: {
          name: randomProduct.name,
          image: randomProduct.image
        }
      },
    ],
  };
}).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

// 2. Mock Analytics Data
export const dailyRevenue = Array.from({ length: 7 }).map((_, i) => {
  const date = subDays(new Date(), 6 - i);
  return {
    date: date.toLocaleDateString("fr-FR", { weekday: "short" }),
    revenue: Math.floor(Math.random() * 50000) + 10000,
    orders: Math.floor(Math.random() * 20) + 5,
  };
});

export const salesByCity = [
  { name: "Casablanca", value: 45 },
  { name: "Rabat", value: 25 },
  { name: "Marrakech", value: 15 },
  { name: "Tanger", value: 10 },
  { name: "Agadir", value: 5 },
];

// 3. Mock Customers
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string;
  status: "active" | "inactive";
}

export const mockCustomers: Customer[] = Array.from({ length: 20 }).map((_, i) => ({
  id: `CUST-${i + 1}`,
  name: `Client ${i + 1}`,
  email: `client${i + 1}@example.com`,
  phone: `+212 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
  city: ["Casablanca", "Rabat", "Marrakech", "Tanger"][Math.floor(Math.random() * 4)],
  ordersCount: Math.floor(Math.random() * 5) + 1,
  totalSpent: Math.floor(Math.random() * 10000) + 1000,
  lastOrderDate: subDays(new Date(), Math.floor(Math.random() * 60)).toISOString(),
  status: Math.random() > 0.2 ? "active" : "inactive",
}));

// 4. Mock Cities
export interface City {
  id: string;
  name: string;
  shippingFee: number;
  deliveryTime: string;
  active: boolean;
}

export const mockCities: City[] = [
  { id: "1", name: "Casablanca", shippingFee: 20, deliveryTime: "24h", active: true },
  { id: "2", name: "Rabat", shippingFee: 25, deliveryTime: "24h", active: true },
  { id: "3", name: "Marrakech", shippingFee: 35, deliveryTime: "48h", active: true },
  { id: "4", name: "Tanger", shippingFee: 35, deliveryTime: "48h", active: true },
  { id: "5", name: "Agadir", shippingFee: 40, deliveryTime: "48-72h", active: true },
  { id: "6", name: "Fès", shippingFee: 30, deliveryTime: "48h", active: true },
  { id: "7", name: "Meknès", shippingFee: 30, deliveryTime: "48h", active: true },
  { id: "8", name: "Oujda", shippingFee: 45, deliveryTime: "72h", active: true },
  { id: "9", name: "Kenitra", shippingFee: 25, deliveryTime: "24h", active: true },
  { id: "10", name: "Tetouan", shippingFee: 40, deliveryTime: "48h", active: true },
  { id: "11", name: "Safi", shippingFee: 35, deliveryTime: "48h", active: true },
  { id: "12", name: "Temara", shippingFee: 25, deliveryTime: "24h", active: true },
  { id: "13", name: "Sale", shippingFee: 25, deliveryTime: "24h", active: true },
  { id: "14", name: "Mohammedia", shippingFee: 20, deliveryTime: "24h", active: true },
];

// 5. Mock Admin Users
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "editor" | "viewer" | "commercial" | "magasinier";
  lastLogin: string;
  status: "active" | "disabled";
}

export const mockAdminUsers: AdminUser[] = [
  {
    id: "1",
    name: "Admin Principal",
    email: "admin@mkarim.ma",
    role: "super_admin",
    lastLogin: new Date().toISOString(),
    status: "active",
  },
  {
    id: "2",
    name: "Support Commercial",
    email: "support@mkarim.ma",
    role: "editor",
    lastLogin: subDays(new Date(), 1).toISOString(),
    status: "active",
  },
];

// 6. Mock Categories
export interface Category {
  id: string;
  name: string;
  slug: string;
  productsCount: number;
  active: boolean;
  icon?: string;
  image?: string;
}

export const mockCategories: Category[] = [
  { id: "1", name: "PC Portable", slug: "laptops", productsCount: 45, active: true },
  { id: "2", name: "PC de Bureau", slug: "desktops", productsCount: 32, active: true },
  { id: "3", name: "PC Gamer", slug: "gaming-pc", productsCount: 28, active: true },
  { id: "4", name: "Moniteurs", slug: "monitors", productsCount: 56, active: true },
  { id: "5", name: "Écrans Gamer", slug: "gaming-monitors", productsCount: 24, active: true },
  { id: "6", name: "Souris Gamer", slug: "gaming-mice", productsCount: 38, active: true },
  { id: "7", name: "Claviers Gamer", slug: "gaming-keyboards", productsCount: 41, active: true },
  { id: "8", name: "Casques Gamer", slug: "gaming-headsets", productsCount: 29, active: true },
];
