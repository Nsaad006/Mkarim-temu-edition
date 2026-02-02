# Quick Reference: Product Specifications

## 🎯 Two Ways to Add Specifications

### **1. With Key (For Filtering)**
Use `{key}: value` format to enable advanced filtering:

```
{gpu}: RTX 5090
{cpu}: Intel Core i9-14900K
{ram}: 32GB DDR5
{stockage}: 2TB NVMe SSD
{marque}: ASUS
```

**Result:** Customers can filter by GPU, CPU, RAM, Storage, Brand

---

### **2. Without Key (General Info)**
Add plain text for general specifications:

```
Écran OLED 4K
Clavier RGB mécanique
Refroidissement liquide
Garantie 3 ans
```

**Result:** Appears in "Hardware Global" filter

---

## 🔑 Common Keys

| Key | Description | Example |
|-----|-------------|---------|
| `{gpu}` | Graphics Card | RTX 5090, RTX 4070 Ti |
| `{cpu}` | Processor | Intel i9-14900K, AMD Ryzen 9 |
| `{ram}` | Memory | 32GB DDR5, 16GB DDR4 |
| `{stockage}` | Storage | 2TB NVMe SSD, 1TB HDD |
| `{marque}` | Brand (Accessories) | ASUS, Corsair, Logitech |
| `{marque_pc}` | PC Brand | ASUS ROG, MSI, Alienware |
| `{ecran}` | Screen | 15.6" FHD, 27" 4K OLED |
| `{carte_mere}` | Motherboard | ASUS ROG Z790 |
| `{systeme_exploitation}` | OS | Windows 11 Pro |
| `{connexion}` | Connection | USB-C, HDMI 2.1 |
| `{autonomie}` | Battery | 8 hours |
| `{poids}` | Weight | 2.5kg |

---

## ✨ Best Practices

### **Mix Both Formats**
```
{gpu}: RTX 5090, {cpu}: Intel i9, {ram}: 64GB DDR5, Refroidissement liquide AIO, RGB Aura Sync, Garantie 3 ans
```

### **Separate with Commas**
Always use commas to separate specifications:
```
{gpu}: RTX 5090, {ram}: 32GB, Écran OLED
```

### **Use Clear Values**
Be specific and consistent:
- ✅ `{gpu}: RTX 5090`
- ✅ `{ram}: 32GB DDR5`
- ❌ `{gpu}: carte graphique`
- ❌ `{ram}: beaucoup`

---

## 📝 Examples by Category

### **Gaming PC**
```
{marque_pc}: ASUS ROG, {cpu}: Intel Core i9-14900K, {gpu}: RTX 5090, {ram}: 64GB DDR5, {stockage}: 4TB NVMe SSD, {carte_mere}: ASUS ROG MAXIMUS Z790, {systeme_exploitation}: Windows 11 Pro, Refroidissement liquide AIO 360mm, RGB Aura Sync, Garantie 3 ans
```

### **Gaming Monitor**
```
{marque}: ASUS, {ecran}: 27" OLED 4K, Taux de rafraîchissement 240Hz, Temps de réponse 0.03ms, HDR10+, G-Sync Compatible, Pied réglable en hauteur
```

### **Gaming Keyboard**
```
{marque}: Corsair, Clavier mécanique RGB, Switches Cherry MX Red, Repose-poignet magnétique, Rétroéclairage per-key RGB, Câble USB-C détachable, Garantie 2 ans
```

### **Gaming Mouse**
```
{marque}: Logitech, {capteur}: HERO 25K, DPI réglable jusqu'à 25,600, 11 boutons programmables, RGB LIGHTSYNC, Sans fil 2.4GHz, Autonomie 60h
```

---

## 🎨 Visual Guide

![Specifications System](./specs_filtering_example.png)

**Left:** How admins input specifications  
**Right:** How customers see filters

---

## ⚡ Quick Tips

1. **Keys are optional** - Use them only when you want filtering
2. **No validation errors** - Add any format you want
3. **Mix formats freely** - Combine keyed and non-keyed specs
4. **Be consistent** - Use the same key names across products
5. **Think about filtering** - Use keys for specs customers want to filter by

---

## 🚀 Summary

- ✅ **With key:** `{gpu}: RTX 5090` → Enables GPU filtering
- ✅ **Without key:** `Écran OLED 4K` → Appears in Hardware Global
- ✅ **No errors:** Add specs in any format
- ✅ **Flexible:** Mix both formats as needed
