import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding subcategories & test products...\n');

    // ─── STEP 1: Create subcategories ───────────────────────────────────────
    console.log('📁 Creating subcategories...');

    const parentSlugs = ['laptops', 'gaming-pc', 'gaming-mice', 'gaming-keyboards', 'gaming-headsets', 'monitors', 'components', 'it-accessories', 'electronics', 'earphones'];
    const parents: Record<string, any> = {};
    for (const slug of parentSlugs) {
        const p = await prisma.category.findUnique({ where: { slug } });
        if (p) parents[slug] = p;
    }

    const subcategoriesData: Array<{ name: string; slug: string; icon: string; parentSlug: string }> = [
        // PC Portable
        { name: 'Ultrabooks', slug: 'ultrabooks', icon: 'Laptop', parentSlug: 'laptops' },
        { name: 'PC Portable Gaming', slug: 'gaming-laptops', icon: 'Gamepad2', parentSlug: 'laptops' },
        { name: 'PC Portable Bureautique', slug: 'office-laptops', icon: 'Briefcase', parentSlug: 'laptops' },
        // PC Gamer
        { name: 'PC Gamer Entrée de Gamme', slug: 'budget-gaming-pc', icon: 'Cpu', parentSlug: 'gaming-pc' },
        { name: 'PC Gamer Milieu de Gamme', slug: 'mid-gaming-pc', icon: 'Cpu', parentSlug: 'gaming-pc' },
        { name: 'PC Gamer Haut de Gamme', slug: 'high-gaming-pc', icon: 'Zap', parentSlug: 'gaming-pc' },
        // Souris Gamer
        { name: 'Souris Sans Fil', slug: 'wireless-mice', icon: 'Wifi', parentSlug: 'gaming-mice' },
        { name: 'Souris Filaire', slug: 'wired-mice', icon: 'Cable', parentSlug: 'gaming-mice' },
        // Claviers Gamer
        { name: 'Claviers Mécaniques', slug: 'mechanical-keyboards', icon: 'Keyboard', parentSlug: 'gaming-keyboards' },
        { name: 'Claviers Compacts TKL', slug: 'tkl-keyboards', icon: 'Keyboard', parentSlug: 'gaming-keyboards' },
        // Casques Gamer
        { name: 'Casques Sans Fil', slug: 'wireless-headsets', icon: 'Headphones', parentSlug: 'gaming-headsets' },
        { name: 'Casques Filaire', slug: 'wired-headsets', icon: 'Headphones', parentSlug: 'gaming-headsets' },
        // Moniteurs
        { name: 'Écrans 144Hz+', slug: 'high-refresh-monitors', icon: 'Monitor', parentSlug: 'monitors' },
        { name: 'Écrans 4K', slug: '4k-monitors', icon: 'Monitor', parentSlug: 'monitors' },
        // Composants
        { name: 'Cartes Graphiques', slug: 'gpu', icon: 'Zap', parentSlug: 'components' },
        { name: 'Processeurs', slug: 'cpu', icon: 'Cpu', parentSlug: 'components' },
        { name: 'RAM', slug: 'ram', icon: 'CircuitBoard', parentSlug: 'components' },
        // Accessoires
        { name: 'Tapis de Souris', slug: 'mousepads', icon: 'Square', parentSlug: 'it-accessories' },
        { name: 'Webcams', slug: 'webcams', icon: 'Camera', parentSlug: 'it-accessories' },
        // Électronique
        { name: 'Smartphones', slug: 'smartphones', icon: 'Smartphone', parentSlug: 'electronics' },
        { name: 'Tablettes', slug: 'tablets', icon: 'Tablet', parentSlug: 'electronics' },
        // AirPods
        { name: 'Écouteurs True Wireless', slug: 'true-wireless', icon: 'Bluetooth', parentSlug: 'earphones' },
        { name: 'Casques Bluetooth', slug: 'bt-headphones', icon: 'Headphones', parentSlug: 'earphones' },
    ];

    const createdSubs: Record<string, any> = {};
    for (const sub of subcategoriesData) {
        const parent = parents[sub.parentSlug];
        if (!parent) { console.log(`   ⚠️  Parent not found: ${sub.parentSlug}`); continue; }
        const existing = await prisma.category.upsert({
            where: { slug: sub.slug },
            update: { parentId: parent.id },
            create: { name: sub.name, slug: sub.slug, icon: sub.icon, active: true, parentId: parent.id }
        });
        createdSubs[sub.slug] = existing;
        console.log(`   ✅ ${sub.name} → parent: ${parent.name}`);
    }

    // ─── STEP 2: Update existing products with subcategories ───────────────
    console.log('\n🔄 Updating existing products with subcategories...');

    const updates: Array<{ name: string; subSlug: string }> = [
        { name: 'PC Portable Dell XPS 15', subSlug: 'office-laptops' },
        { name: 'MacBook Pro 14" M3', subSlug: 'ultrabooks' },
        { name: 'PC Gamer MKARIM Pro RTX 4070', subSlug: 'high-gaming-pc' },
        { name: 'Logitech G Pro X Superlight', subSlug: 'wireless-mice' },
        { name: 'Razer BlackWidow V3', subSlug: 'mechanical-keyboards' },
        { name: 'ASUS ROG Strix G15', subSlug: 'gaming-laptops' },
        { name: 'HyperX Cloud II Wireless', subSlug: 'wireless-headsets' },
        { name: 'MSI Optix MAG274QRF-QD', subSlug: 'high-refresh-monitors' },
        { name: 'NVIDIA GeForce RTX 4090', subSlug: 'gpu' },
        { name: 'Apple AirPods Pro 2', subSlug: 'true-wireless' },
        { name: 'SteelSeries Apex Pro TKL', subSlug: 'tkl-keyboards' },
        { name: 'Corsair Vengeance RGB 32GB', subSlug: 'ram' },
        { name: 'Samsung 990 PRO 2TB', subSlug: 'components' },
        { name: 'Razer DeathAdder V3 Pro', subSlug: 'wireless-mice' },
        { name: 'Elgato Stream Deck MK.2', subSlug: 'webcams' },
        { name: 'ASUS ROG Zephyrus G14', subSlug: 'gaming-laptops' },
        { name: 'Sony INZONE H9', subSlug: 'wireless-headsets' },
        { name: 'LG UltraGear 27GN950-B', subSlug: '4k-monitors' },
        { name: 'NZXT Kraken Elite 360', subSlug: 'components' },
        { name: 'Secretlab TITAN Evo', subSlug: 'mousepads' }
    ];

    for (const upd of updates) {
        const sub = createdSubs[upd.subSlug];
        if (!sub) { console.log(`   ⚠️  Sub not found: ${upd.subSlug}`); continue; }
        const prod = await prisma.product.findFirst({ where: { name: upd.name } });
        if (prod) {
            await prisma.product.update({ where: { id: prod.id }, data: { categoryId: sub.id } });
            console.log(`   ✅ "${upd.name}" → ${sub.name}`);
        }
    }

    // ─── STEP 3: Get supplier ───────────────────────────────────────────────
    const supplier = await prisma.supplier.findFirst();
    if (!supplier) { console.log('❌ No supplier found — run main seed first'); return; }

    // ─── STEP 4: Seed new test products ────────────────────────────────────
    console.log('\n🛒 Creating new test products...');

    const newProducts = [
        // Gaming Laptops
        {
            name: 'ASUS ROG Strix G16 RTX 4060',
            description: 'PC portable gaming avec RTX 4060, écran 165Hz, système de refroidissement ROG.',
            price: 14999, originalPrice: 16999,
            image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600',
            subSlug: 'gaming-laptops', quantity: 20, badge: 'Bestseller',
            specs: ['{cpu}: Intel i7-13650HX', '{gpu}: RTX 4060 8GB', '{ram}: 16GB DDR5', '{ecran}: 16" 165Hz', '{marque}: ASUS ROG']
        },
        {
            name: 'Lenovo Legion 5 Pro RTX 4070',
            description: 'Laptop gaming haute performance, écran WQXGA 165Hz Mini-LED.',
            price: 19999, originalPrice: 22999,
            image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600',
            subSlug: 'gaming-laptops', quantity: 12, badge: 'Pro',
            specs: ['{cpu}: AMD Ryzen 7 7745HX', '{gpu}: RTX 4070 8GB', '{ram}: 32GB DDR5', '{ecran}: 16" WQXGA 165Hz', '{marque}: Lenovo']
        },
        // Budget Gaming PCs
        {
            name: 'PC Gamer MKARIM Starter GTX 1650',
            description: 'Votre premier PC Gaming, idéal pour débuter à petit budget.',
            price: 5999, originalPrice: 6999,
            image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=600',
            subSlug: 'budget-gaming-pc', quantity: 40, badge: 'Promo',
            specs: ['{cpu}: Intel Core i5-12400F', '{gpu}: GTX 1650 4GB', '{ram}: 8GB DDR4', '{stockage}: 500GB SSD', '{marque_pc}: MKARIM Custom']
        },
        {
            name: 'PC Gamer MKARIM Essential RX 6600',
            description: 'Performances solides pour jeux 1080p en ultra.',
            price: 7999, originalPrice: 8999,
            image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600',
            subSlug: 'budget-gaming-pc', quantity: 25, badge: null,
            specs: ['{cpu}: Intel Core i5-13600F', '{gpu}: RX 6600 8GB', '{ram}: 16GB DDR4', '{stockage}: 512GB NVMe', '{marque_pc}: MKARIM Custom']
        },
        // Mid Gaming PCs
        {
            name: 'PC Gamer MKARIM Force RTX 3080',
            description: 'Tour gaming milieu de gamme, jeux en 1440p ultra-fluide.',
            price: 13999, originalPrice: 15500,
            image: 'https://images.unsplash.com/photo-1587202372583-49330a15584d?w=600',
            subSlug: 'mid-gaming-pc', quantity: 18, badge: 'Bestseller',
            specs: ['{cpu}: Intel Core i7-13700K', '{gpu}: RTX 3080 10GB', '{ram}: 32GB DDR5', '{stockage}: 1TB NVMe SSD', '{marque_pc}: MKARIM Custom']
        },
        // High-End Gaming PCs
        {
            name: 'PC Gamer MKARIM Titan RTX 4090',
            description: 'Le monstre absolu — 4K/144fps sur tous les jeux.',
            price: 34999, originalPrice: 38999,
            image: 'https://images.unsplash.com/photo-1587202372609-5f4e4c0a0b15?w=600',
            subSlug: 'high-gaming-pc', quantity: 5, badge: 'Nouveau',
            specs: ['{cpu}: Intel Core i9-14900K', '{gpu}: RTX 4090 24GB', '{ram}: 64GB DDR5', '{stockage}: 2TB NVMe SSD', '{marque_pc}: MKARIM Ultra']
        },
        // Wired mice
        {
            name: 'Razer DeathAdder V3',
            description: 'Souris gaming filaire légère avec capteur Focus Pro 30K.',
            price: 899, originalPrice: 999,
            image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=600',
            subSlug: 'wired-mice', quantity: 45, badge: 'Pro',
            specs: ['{capteur}: Focus Pro 30K', '{poids}: 59g', '{connexion}: Filaire USB', '{dpi}: 30000 DPI', '{marque}: Razer']
        },
        {
            name: 'Logitech G502 X Plus',
            description: 'Souris gaming sans fil avec poids ajustable.',
            price: 1299, originalPrice: 1599,
            image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=600',
            subSlug: 'wireless-mice', quantity: 30, badge: null,
            specs: ['{capteur}: HERO 25K', '{poids}: 106g', '{connexion}: LIGHTSPEED Sans Fil', '{autonomie}: 130h', '{marque}: Logitech']
        },
        // TKL Keyboards
        {
            name: 'SteelSeries Apex Pro TKL',
            description: 'Clavier mécanique compact avec switchs OmniPoint magnétiques.',
            price: 1699, originalPrice: 1999,
            image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600',
            subSlug: 'tkl-keyboards', quantity: 22, badge: 'Pro',
            specs: ['{switch}: OmniPoint Magnétique', '{format}: TKL (75%)', '{eclairage}: RGB', '{connexion}: USB-C', '{marque}: SteelSeries']
        },
        {
            name: 'HyperX Alloy Origins 65',
            description: 'Clavier compact 65% mécanique avec RGB.',
            price: 799, originalPrice: 999,
            image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600',
            subSlug: 'tkl-keyboards', quantity: 35, badge: 'Promo',
            specs: ['{switch}: HyperX Red Linear', '{format}: 65%', '{eclairage}: RGB', '{connexion}: USB-C', '{marque}: HyperX']
        },
        // Wireless Headsets
        {
            name: 'SteelSeries Arctis Nova Pro Wireless',
            description: 'Casque gaming sans fil premium avec double batterie et ANC.',
            price: 2999, originalPrice: 3499,
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
            subSlug: 'wireless-headsets', quantity: 15, badge: 'Premium',
            specs: ['{connexion}: Sans fil + Bluetooth', '{autonomie}: 22h + batterie de secours', '{micro}: Rétractable', '{anc}: Active Noise Cancelling', '{marque}: SteelSeries']
        },
        {
            name: 'Logitech G733 Lightspeed',
            description: 'Casque gaming coloré sans fil avec micro Blue VO!CE.',
            price: 1499, originalPrice: 1799,
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
            subSlug: 'wireless-headsets', quantity: 28, badge: null,
            specs: ['{connexion}: LIGHTSPEED Sans Fil', '{autonomie}: 29h', '{micro}: Blue VO!CE', '{eclairage}: RGB', '{marque}: Logitech']
        },
        // Wired Headsets
        {
            name: 'HyperX Cloud II',
            description: 'Casque filaire gaming avec son 7.1 virtuel.',
            price: 699, originalPrice: 899,
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
            subSlug: 'wired-headsets', quantity: 50, badge: 'Promo',
            specs: ['{connexion}: USB + Jack 3.5mm', '{son}: 7.1 Surround Virtuel', '{micro}: Amovible', '{coussinets}: Mousse à mémoire de forme', '{marque}: HyperX']
        },
        // Monitors
        {
            name: 'Samsung Odyssey G5 27" 165Hz',
            description: 'Écran gaming incurvé 1440p, temps de réponse 1ms.',
            price: 3499, originalPrice: 3999,
            image: 'https://images.unsplash.com/photo-1527443224154-c4a573d5f400?w=600',
            subSlug: 'high-refresh-monitors', quantity: 20, badge: 'Bestseller',
            specs: ['{resolution}: 2560x1440 WQHD', '{frequence}: 165Hz', '{temps_reponse}: 1ms', '{format}: 27" Incurvé 1000R', '{marque}: Samsung']
        },
        {
            name: 'LG UltraGear 27GN950 4K 144Hz',
            description: 'Écran gaming 4K Nano IPS, parfait pour la génération PS5/RTX 40.',
            price: 5999, originalPrice: 6999,
            image: 'https://images.unsplash.com/photo-1527443224154-c4a573d5f400?w=600',
            subSlug: '4k-monitors', quantity: 10, badge: 'Nouveau',
            specs: ['{resolution}: 3840x2160 UHD 4K', '{frequence}: 144Hz', '{temps_reponse}: 1ms IPS', '{format}: 27" Nano IPS', '{marque}: LG']
        },
        // GPU
        {
            name: 'NVIDIA RTX 4070 Super 12GB',
            description: 'Carte graphique parfaite pour le gaming 1440p ultra.',
            price: 7999, originalPrice: 8999,
            image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600',
            subSlug: 'gpu', quantity: 8, badge: 'Nouveau',
            specs: ['{memoire}: 12GB GDDR6X', '{bus}: PCIe 4.0 x16', '{alimentation}: 285W TDP', '{sorties}: HDMI 2.1 + DP 1.4', '{marque}: NVIDIA']
        },
        {
            name: 'AMD Radeon RX 7700 XT 12GB',
            description: 'Alternative AMD performante pour le gaming 1440p.',
            price: 5499, originalPrice: 5999,
            image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600',
            subSlug: 'gpu', quantity: 12, badge: null,
            specs: ['{memoire}: 12GB GDDR6', '{bus}: PCIe 4.0 x16', '{alimentation}: 245W TDP', '{sorties}: HDMI 2.1 + DP 2.1', '{marque}: AMD']
        },
        // CPU
        {
            name: 'Intel Core i9-14900K',
            description: 'Processeur desktop le plus puissant d\'Intel en 2024.',
            price: 4299, originalPrice: 4999,
            image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600',
            subSlug: 'cpu', quantity: 15, badge: 'Bestseller',
            specs: ['{coeurs}: 24 cœurs (8P+16E)', '{frequence}: 6.0GHz Boost', '{socket}: LGA1700', '{tdp}: 125W Base / 253W Max', '{marque}: Intel']
        },
        {
            name: 'AMD Ryzen 9 7900X3D',
            description: 'Processeur AMD avec technologie 3D V-Cache pour le gaming.',
            price: 3799, originalPrice: 4299,
            image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600',
            subSlug: 'cpu', quantity: 10, badge: 'Pro',
            specs: ['{coeurs}: 12 cœurs / 24 threads', '{frequence}: 5.6GHz Boost', '{socket}: AM5', '{cache}: 128MB 3D V-Cache', '{marque}: AMD']
        },
        // RAM
        {
            name: 'Corsair Vengeance DDR5 32GB 6000MHz',
            description: 'RAM DDR5 hautes performances pour plateformes Intel et AMD.',
            price: 1299, originalPrice: 1499,
            image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600',
            subSlug: 'ram', quantity: 30, badge: null,
            specs: ['{capacite}: 32GB (2x16GB)', '{frequence}: 6000MHz DDR5', '{latence}: CL36', '{profil}: Intel XMP 3.0 / AMD EXPO', '{marque}: Corsair']
        },
        // Mousepads
        {
            name: 'SteelSeries QcK Heavy XL',
            description: 'Grand tapis de souris gaming épais pour bureau complet.',
            price: 299, originalPrice: 399,
            image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=600',
            subSlug: 'mousepads', quantity: 80, badge: null,
            specs: ['{surface}: Tissu micro-texture', '{dimensions}: 900 x 300 x 6mm', '{base}: Caoutchouc antidérapant', '{marque}: SteelSeries']
        },
        // True Wireless
        {
            name: 'Apple AirPods Pro 2ème génération',
            description: 'Écouteurs true wireless avec ANC adaptatif et son spatial.',
            price: 2799, originalPrice: 2999,
            image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600',
            subSlug: 'true-wireless', quantity: 25, badge: 'Bestseller',
            specs: ['{connexion}: Bluetooth 5.3', '{anc}: Active Noise Cancelling adaptatif', '{autonomie}: 30h avec boîtier', '{resistance}: IPX4', '{marque}: Apple']
        },
        {
            name: 'Samsung Galaxy Buds3 Pro',
            description: 'Écouteurs ANC premium avec design ouvert et son Hi-Fi.',
            price: 1799, originalPrice: 1999,
            image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600',
            subSlug: 'true-wireless', quantity: 20, badge: null,
            specs: ['{connexion}: Bluetooth 5.4', '{anc}: Active Noise Cancelling 2-voies', '{autonomie}: 30h avec boîtier', '{resistance}: IPX7', '{marque}: Samsung']
        },
        // Smartphones
        {
            name: 'iPhone 15 Pro 256GB',
            description: 'Smartphone Apple avec puce A17 Pro et Action Button.',
            price: 13999, originalPrice: 14999,
            image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
            subSlug: 'smartphones', quantity: 20, badge: 'Nouveau',
            specs: ['{puce}: A17 Pro', '{stockage}: 256GB', '{ecran}: 6.1" Super Retina XDR', '{camera}: 48MP Main + Télé 3x', '{marque}: Apple']
        },
        {
            name: 'Samsung Galaxy S24 Ultra',
            description: 'Flagship Samsung avec stylet S-Pen intégré et IA Galaxy.',
            price: 14999, originalPrice: 16999,
            image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600',
            subSlug: 'smartphones', quantity: 15, badge: 'Bestseller',
            specs: ['{puce}: Snapdragon 8 Gen 3', '{stockage}: 256GB', '{ecran}: 6.8" Dynamic AMOLED 120Hz', '{camera}: 200MP + Zoom 100x', '{marque}: Samsung']
        },
    ];

    for (const prod of newProducts) {
        const sub = createdSubs[prod.subSlug];
        if (!sub) { console.log(`   ⚠️  Sub not found: ${prod.subSlug}`); continue; }

        const existing = await prisma.product.findFirst({ where: { name: prod.name } });
        if (existing) {
            await prisma.product.update({ where: { id: existing.id }, data: { categoryId: sub.id } });
            console.log(`   🔄 Updated: ${prod.name}`);
            continue;
        }

        const created = await prisma.product.create({
            data: {
                name: prod.name,
                description: prod.description,
                price: prod.price,
                originalPrice: prod.originalPrice ?? undefined,
                image: prod.image,
                images: [prod.image],
                categoryId: sub.id,
                quantity: prod.quantity,
                inStock: prod.quantity > 0,
                badge: prod.badge ?? undefined,
                specs: prod.specs,
                isFeatured: false,
                published: true,
            }
        });

        // Add procurement record
        await prisma.procurement.create({
            data: {
                productId: created.id,
                quantityPurchased: prod.quantity,
                unitCostPrice: Math.round(prod.price * 0.75),
                totalCost: Math.round(prod.price * 0.75) * prod.quantity,
                supplierId: supplier.id,
                purchaseDate: new Date(),
            }
        });

        console.log(`   ✅ Created: ${prod.name} (${sub.name})`);
    }

    console.log('\n✨ Subcategories and test products seeded successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
