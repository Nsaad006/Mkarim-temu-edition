# Free Shipping Not Working - Troubleshooting Guide

## 🔍 Problem

Free shipping settings (Livraison Gratuite) are configured in admin panel:
- ✅ Enabled: ON
- 💰 Threshold: 5000 DH

But checkout still shows shipping fee (+25 DH) even when cart total is 20,000 DH (which is > 5000 DH).

---

## 🎯 Root Cause

The database fields `freeShippingEnabled` and `freeShippingThreshold` were added to the schema, but the database migration was NOT successfully applied.

**Evidence:**
- The Prisma migration encountered an error (EPERM - file locked)
- The backend server was running during migration attempt
- Database doesn't have the new columns

---

## ✅ Solution - Step by Step

### **Step 1: Stop the Backend Server**

1. Go to the terminal running the backend
2. Press `Ctrl+C` to stop it
3. Wait for it to fully stop

---

### **Step 2: Apply the Database Migration**

Run this command in the `backend` folder:

```bash
cd backend
npx prisma db push
```

**Expected output:**
```
✔ Database synchronized with Prisma schema
✔ Generated Prisma Client
```

---

### **Step 3: Restart the Backend**

```bash
npm run dev
```

---

### **Step 4: Verify Settings Are Saved**

1. Go to `/admin/settings`
2. Click "Checkout" tab
3. Check if your settings are still there:
   - Livraison Gratuite: ON
   - Montant minimum: 5000

4. If they're NOT there, re-enter them and click "SAUVEGARDER"

---

### **Step 5: Test the Checkout**

1. Add a product worth 20,000 DH to cart
2. Go to checkout
3. Select a city (e.g., Rabat)

**Expected Result:**
```
SOUS-TOTAL              20,000 DH
LIVRAISON                 OFFERTE ✅

🎉 Livraison Gratuite Appliquée
   (Total ≥ 5,000 DH)

Total Net              20,000 DH
```

---

## 🔧 Alternative: Manual Database Update

If `npx prisma db push` doesn't work, you can manually add the columns:

### **Option A: Using Prisma Studio**

```bash
cd backend
npx prisma studio
```

Then manually check if the `Settings` table has these columns:
- `freeShippingEnabled` (Boolean)
- `freeShippingThreshold` (Int)

### **Option B: Using SQL**

Connect to your PostgreSQL database and run:

```sql
-- Add freeShippingEnabled column
ALTER TABLE "Settings" 
ADD COLUMN IF NOT EXISTS "freeShippingEnabled" BOOLEAN DEFAULT false;

-- Add freeShippingThreshold column
ALTER TABLE "Settings" 
ADD COLUMN IF NOT EXISTS "freeShippingThreshold" INTEGER DEFAULT 0;
```

---

## 🧪 Testing Checklist

After applying the migration:

### **Test 1: Cart Below Threshold**
- Cart Total: 3,000 DH
- Threshold: 5,000 DH
- **Expected:** Shipping fee applies (e.g., +25 DH)
- **Expected Message:** "💡 Livraison Gratuite Si Total Commande ≥ 5,000 DH"

### **Test 2: Cart Above Threshold**
- Cart Total: 20,000 DH
- Threshold: 5,000 DH
- **Expected:** Shipping = OFFERTE (0 DH)
- **Expected Message:** "🎉 Livraison Gratuite Appliquée (Total ≥ 5,000 DH)"

### **Test 3: Free Shipping Disabled**
- Disable "Livraison Gratuite" in settings
- Cart Total: 20,000 DH
- **Expected:** Normal shipping applies
- **Expected Message:** None

---

## 📊 Debug Information

If it still doesn't work after migration, open browser console (F12) on the checkout page and look for:

```
Free Shipping Debug: {
  freeShippingEnabled: true,
  freeShippingThreshold: 5000,
  cartTotal: 20000,
  globalSettings: { ... }
}
Qualifies for free shipping: true
```

**If you see:**
- `freeShippingEnabled: false` → Settings not saved correctly
- `freeShippingThreshold: 0` → Threshold not saved correctly
- `globalSettings: undefined` → Settings not loading from backend

---

## 🚨 Common Issues

### **Issue 1: "EPERM: operation not permitted"**
**Cause:** Backend server is running
**Solution:** Stop backend, run migration, restart backend

### **Issue 2: Settings not saving**
**Cause:** Database columns don't exist
**Solution:** Run `npx prisma db push`

### **Issue 3: Free shipping not applying**
**Cause:** Threshold is 0 or settings not loaded
**Solution:** 
1. Check database has the columns
2. Re-save settings in admin panel
3. Refresh checkout page

---

## 📝 Summary

**The code is correct!** The issue is just that the database migration wasn't applied.

**Quick Fix:**
1. Stop backend
2. Run: `npx prisma db push`
3. Restart backend
4. Re-save settings in admin panel
5. Test checkout

**After this, free shipping will work perfectly!** 🚀
