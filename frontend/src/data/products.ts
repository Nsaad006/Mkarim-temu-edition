export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;  // Primary image (first in images array)
  images?: string[];  // All product images
  categoryId: string; // Changed from category
  category?: {
    id: string;
    name: string;
  };
  inStock: boolean;
  quantity: number; // Added
  badge?: string;
  specs?: string[];
  weightedAverageCost?: number;
  stockValue?: number;
  salesCount?: number;
  isFeatured?: boolean;
  published?: boolean;
}

export const products: Product[] = [
  {
    id: "1",
    name: "PC Gamer MKARIM Pro RTX 4070",
    description: "PC Gaming haute performance avec RTX 4070, Intel i7, 32GB RAM",
    price: 18999,
    originalPrice: 21999,
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600",
    categoryId: "gaming-pc",
    inStock: true,
    quantity: 50,
    badge: "Bestseller",
    specs: ["Intel Core i7-13700K", "RTX 4070 12GB", "32GB DDR5", "1TB NVMe SSD"],
  },
  {
    id: "2",
    name: "ASUS ROG Zephyrus G16",
    description: "PC Portable Gaming 16 pouces, RTX 4060, Intel i9",
    price: 24999,
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600",
    categoryId: "laptops",
    inStock: true,
    quantity: 30,
    specs: ["Intel Core i9-13900H", "RTX 4060 8GB", "16GB DDR5", "512GB SSD"],
  },
  {
    id: "3",
    name: "Écran Gaming ASUS ROG 27\" 165Hz",
    description: "Moniteur IPS 2K, 1ms, G-Sync Compatible",
    price: 3499,
    originalPrice: 3999,
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600",
    categoryId: "gaming-monitors",
    inStock: true,
    quantity: 20,
    badge: "-12%",
    specs: ["27 pouces QHD", "165Hz", "1ms GTG", "HDR400"],
  },
  {
    id: "4",
    name: "Casque Gamer HyperX Cloud III",
    description: "Son Surround 7.1, Micro détachable, Ultra confortable",
    price: 899,
    image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600",
    categoryId: "gaming-headsets",
    inStock: true,
    quantity: 15,
    specs: ["DTS Headphone:X", "Micro antibruit", "Driver 53mm"],
  },
  {
    id: "5",
    name: "Souris Logitech G Pro X Superlight",
    description: "Souris sans fil professionnelle, capteur HERO 25K",
    price: 1299,
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600",
    categoryId: "gaming-mice",
    inStock: true,
    quantity: 40,
    badge: "Pro",
    specs: ["25,600 DPI", "< 1ms sans fil", "63g ultraléger"],
  },
  {
    id: "6",
    name: "Clavier Mécanique Razer BlackWidow",
    description: "Switches Razer Green, RGB Chroma, Repose-poignet",
    price: 1599,
    originalPrice: 1799,
    image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=600",
    categoryId: "gaming-keyboards",
    inStock: true,
    quantity: 25,
    specs: ["Switches Green", "RGB par touche", "Repose-poignet magnétique"],
  },
  {
    id: "7",
    name: "AirPods Pro 2ème Génération",
    description: "Réduction de bruit active, Audio spatial, Boîtier MagSafe",
    price: 2499,
    image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600",
    categoryId: "earphones",
    inStock: true,
    quantity: 60,
    specs: ["ANC adaptatif", "Audio spatial", "6h autonomie"],
  },
  {
    id: "8",
    name: "PC Bureau Business MKARIM Office",
    description: "Configuration professionnelle, Intel i5, 16GB RAM",
    price: 5999,
    image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600",
    categoryId: "desktops",
    inStock: true,
    quantity: 10,
    specs: ["Intel Core i5-13400", "16GB DDR4", "512GB SSD", "Windows 11 Pro"],
  },
];
