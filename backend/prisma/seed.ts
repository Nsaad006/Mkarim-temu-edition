import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...\n');

    // 1. Seed Admin User
    console.log('👤 Seeding admin user...');
    const hashedPassword = await bcrypt.hash('123456', 10);
    const admin = await prisma.admin.upsert({
        where: { email: 'admin@mkarim.ma' },
        update: { password: hashedPassword },
        create: {
            email: 'admin@mkarim.ma',
            password: hashedPassword,
            name: 'Admin Principal',
            role: 'super_admin',
            active: true
        }
    });
    console.log(`   ✅ Admin user created: ${admin.email}\n`);

    // 2. Seed Settings
    console.log('⚙️ Seeding global settings...');
    await prisma.settings.upsert({
        where: { id: 'global-settings' },
        update: {},
        create: {
            id: 'global-settings',
            storeName: 'MKARIM SOLUTION',
            storeAvailability: true,
            codEnabled: true,
            whatsappNumber: '+212 6 00 00 00 00',
            currency: 'MAD',
            contactAddress: 'Casablanca, Maroc',
            contactPhone: '+212 6 00 00 00 00',
            contactEmail: 'contact@mkarim.ma',
            footerDescription: 'Votre destination ultime pour le gaming au Maroc. Performance, passion et innovation au service des gamers.',
            footerCopyright: '© 2025 MKARIM SOLUTION – Engineered for Gamers',
            emailEnabled: false
        }
    });
    console.log('   ✅ Settings updated\n');

    // 3. Seed Categories
    console.log('📁 Seeding categories...');
    const categoriesData = [
        { name: 'PC Portable', slug: 'laptops', icon: 'Laptop' },
        { name: 'PC de Bureau', slug: 'desktops', icon: 'Cpu' },
        { name: 'PC Gamer', slug: 'gaming-pc', icon: 'Gamepad2' },
        { name: 'Moniteurs', slug: 'monitors', icon: 'Monitor' },
        { name: 'Écrans Gamer', slug: 'gaming-monitors', icon: 'Tv' },
        { name: 'Souris Gamer', slug: 'gaming-mice', icon: 'Mouse' },
        { name: 'Claviers Gamer', slug: 'gaming-keyboards', icon: 'Keyboard' },
        { name: 'Casques Gamer', slug: 'gaming-headsets', icon: 'Headset' },
        { name: 'AirPods & Écouteurs', slug: 'earphones', icon: 'Bluetooth' },
        { name: 'Accessoires', slug: 'it-accessories', icon: 'Cable' },
        { name: 'Composants', slug: 'components', icon: 'Cpu' },
        { name: 'Électronique', slug: 'electronics', icon: 'Zap' }
    ];

    const createdCategories: Record<string, any> = {};
    for (const cat of categoriesData) {
        const category = await prisma.category.upsert({
            where: { slug: cat.slug },
            update: { name: cat.name, icon: cat.icon },
            create: {
                name: cat.name,
                slug: cat.slug,
                icon: cat.icon,
                active: true
            }
        });
        createdCategories[cat.slug] = category;
        console.log(`   ✅ ${category.name}`);
    }
    console.log('');

    // 4. Seed Cities
    console.log('🏙️  Seeding cities...');
    const citiesData = [
        { name: 'Casablanca', shippingFee: 20, deliveryTime: '24h' },
        { name: 'Rabat', shippingFee: 25, deliveryTime: '24h' },
        { name: 'Mohammedia', shippingFee: 20, deliveryTime: '24h' },
        { name: 'Temara', shippingFee: 25, deliveryTime: '24h' },
        { name: 'Marrakech', shippingFee: 35, deliveryTime: '48h' },
        { name: 'Fès', shippingFee: 35, deliveryTime: '48h' },
        { name: 'Tanger', shippingFee: 35, deliveryTime: '48h' },
        { name: 'Meknès', shippingFee: 35, deliveryTime: '48h' },
        { name: 'Agadir', shippingFee: 40, deliveryTime: '72h' },
        { name: 'Kenitra', shippingFee: 30, deliveryTime: '48h' },
        { name: 'Oujda', shippingFee: 45, deliveryTime: '72h' },
        { name: 'Tetouan', shippingFee: 40, deliveryTime: '48h' },
        { name: 'Safi', shippingFee: 40, deliveryTime: '72h' },
        { name: 'Salé', shippingFee: 25, deliveryTime: '24h' },
        { name: 'Nador', shippingFee: 45, deliveryTime: '72h' },
        { name: 'Beni Mellal', shippingFee: 40, deliveryTime: '72h' },
        { name: 'El Jadida', shippingFee: 30, deliveryTime: '48h' },
        { name: 'Khouribga', shippingFee: 35, deliveryTime: '48h' },
        { name: 'Settat', shippingFee: 30, deliveryTime: '48h' },
        { name: 'Larache', shippingFee: 40, deliveryTime: '72h' },
        { name: 'Ksar El Kebir', shippingFee: 40, deliveryTime: '72h' },
        { name: 'Khemisset', shippingFee: 35, deliveryTime: '48h' },
        { name: 'Guelmim', shippingFee: 50, deliveryTime: '96h' },
        { name: 'Berrechid', shippingFee: 25, deliveryTime: '24h' },
        { name: 'Ouarzazate', shippingFee: 50, deliveryTime: '96h' },
        { name: 'Fquih Ben Salah', shippingFee: 40, deliveryTime: '72h' },
        { name: 'Taourirt', shippingFee: 45, deliveryTime: '72h' },
        { name: 'Berkane', shippingFee: 45, deliveryTime: '72h' },
        { name: 'Sidi Slimane', shippingFee: 40, deliveryTime: '72h' },
        { name: 'Errachidia', shippingFee: 55, deliveryTime: '96h' },
        { name: 'Sidi Kacem', shippingFee: 40, deliveryTime: '72h' },
        { name: 'Khenifra', shippingFee: 45, deliveryTime: '72h' },
        { name: 'Tifelt', shippingFee: 35, deliveryTime: '48h' },
        { name: 'Ouazzane', shippingFee: 45, deliveryTime: '72h' },
        { name: 'Taroudant', shippingFee: 45, deliveryTime: '72h' },
        { name: 'Essaouira', shippingFee: 45, deliveryTime: '72h' },
        { name: 'Tan-Tan', shippingFee: 55, deliveryTime: '96h' },
        { name: 'Sidi Bennour', shippingFee: 40, deliveryTime: '72h' },
        { name: 'Tiznit', shippingFee: 45, deliveryTime: '72h' },
        { name: 'Azrou', shippingFee: 45, deliveryTime: '72h' },
        { name: 'Laayoune', shippingFee: 60, deliveryTime: '96h' },
        { name: 'Dakhla', shippingFee: 70, deliveryTime: '120h' }
    ];

    for (const city of citiesData) {
        await prisma.city.upsert({
            where: { name: city.name },
            update: city,
            create: { ...city, active: true }
        });
        console.log(`   ✅ ${city.name}`);
    }
    console.log('');

    // 5. Seed Suppliers
    console.log('🏭 Seeding suppliers...');
    const mainSupplier = await prisma.supplier.upsert({
        where: { id: 'default-supplier' },
        update: {},
        create: {
            id: 'default-supplier',
            name: 'Fournisseur Principal',
            phone: '+212 600000000',
            email: 'supply@example.com',
            city: 'Casablanca'
        }
    });
    console.log(`   ✅ Supplier created: ${mainSupplier.name}\n`);

    // 6. Seed Products
    console.log('🛒 Seeding products...');
    const productsData = [
        {
            name: 'PC Portable Dell XPS 15',
            description: 'Ultrabook professionnel avec écran 4K',
            price: 15999,
            originalPrice: 17999,
            image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600',
            categoryId: createdCategories['laptops'].id,
            quantity: 30,
            badge: 'Nouveau',
            specs: ['{cpu}: Intel i7-12700H', '{ram}: 16GB RAM', '{stockage}: 512GB SSD', '{ecran}: 15.6" 4K', '{marque}: Dell']
        },
        {
            name: 'MacBook Pro 14" M3',
            description: 'Performance exceptionnelle pour les créatifs',
            price: 24999,
            originalPrice: null,
            image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
            categoryId: createdCategories['laptops'].id,
            quantity: 15,
            badge: 'Bestseller',
            specs: ['{cpu}: Apple M3', '{ram}: 16GB RAM', '{stockage}: 512GB SSD', '{ecran}: Retina 14"', '{marque}: Apple']
        },
        {
            name: 'PC Gamer MKARIM Pro RTX 4070',
            description: 'PC Gaming haute performance avec RTX 4070, Intel i7, 32GB RAM',
            price: 18999,
            originalPrice: 21999,
            image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600',
            categoryId: createdCategories['gaming-pc'].id,
            quantity: 50,
            badge: 'Bestseller',
            specs: ['{cpu}: Intel Core i7-13700K', '{gpu}: RTX 4070 12GB', '{ram}: 32GB DDR5', '{stockage}: 1TB NVMe SSD', '{marque_pc}: MKARIM Custom']
        },
        {
            name: 'Logitech G Pro X Superlight',
            description: 'Souris gaming sans fil ultra-légère',
            price: 1499,
            originalPrice: null,
            image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=600',
            categoryId: createdCategories['gaming-mice'].id,
            quantity: 60,
            badge: 'Pro',
            specs: ['{connexion}: Sans fil', '{poids}: 63g', '{capteur}: Hero 25K', '{autonomie}: 70h', '{marque}: Logitech']
        },
        {
            name: 'Razer BlackWidow V3',
            description: 'Clavier mécanique RGB gaming',
            price: 1899,
            originalPrice: 2199,
            image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600',
            categoryId: createdCategories['gaming-keyboards'].id,
            quantity: 35,
            badge: 'Promo',
            specs: ['{switch}: Mécaniques', '{feature}: RGB Chroma', '{feature}: Repose-poignet', '{connexion}: USB-C', '{marque}: Razer']
        },
        {
            name: 'ASUS ROG Strix G15',
            description: 'Puissance gaming portable à l\'état pur',
            price: 16499,
            originalPrice: 18499,
            image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600',
            categoryId: createdCategories['laptops'].id,
            quantity: 25,
            badge: 'Gamer',
            specs: ['{cpu}: Ryzen 9 5900HX', '{gpu}: RTX 3070', '{ram}: 16GB', '{ecran}: 300Hz', '{marque}: ASUS']
        },
        {
            name: 'HyperX Cloud II Wireless',
            description: 'Confort légendaire et son surround 7.1',
            price: 1699,
            originalPrice: 1999,
            image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600',
            categoryId: createdCategories['gaming-headsets'].id,
            quantity: 40,
            badge: 'Populaire',
            specs: ['{type}: Casque sans fil', '{audio}: Surround 7.1', '{autonomie}: 30h', '{micro}: Détachable', '{marque}: HyperX']
        },
        {
            name: 'MSI Optix MAG274QRF-QD',
            description: 'Écran Gaming eSports 165Hz Quantum Dot',
            price: 4999,
            originalPrice: null,
            image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600',
            categoryId: createdCategories['gaming-monitors'].id,
            quantity: 20,
            badge: 'Premium',
            specs: ['{taille}: 27 pouces', '{resolution}: 1440p', '{taux}: 165Hz', '{dalle}: Rapid IPS', '{marque}: MSI']
        },
        {
            name: 'NVIDIA GeForce RTX 4090',
            description: 'La carte graphique la plus puissante du marché',
            price: 23999,
            originalPrice: 25999,
            image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=600',
            categoryId: createdCategories['components'].id,
            quantity: 5,
            badge: 'Ultra',
            specs: ['{vram}: 24GB GDDR6X', '{coeurs}: 16384 CUDA', '{feature}: DLSS 3.0', '{conso}: 450W', '{marque}: NVIDIA']
        },
        {
            name: 'Apple AirPods Pro 2',
            description: 'Réduction de bruit active et Audio Spatial',
            price: 2999,
            originalPrice: 3299,
            image: 'https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=600',
            categoryId: createdCategories['earphones'].id,
            quantity: 80,
            badge: 'Promo',
            specs: ['{type}: Intra-auriculaire', '{anc}: Oui', '{puce}: H2', '{autonomie}: 6h (30h boitier)', '{marque}: Apple']
        },
        {
            name: 'SteelSeries Apex Pro TKL',
            description: 'Clavier mécanique avec switches OmniPoint ajustables',
            price: 2299,
            originalPrice: null,
            image: 'https://images.unsplash.com/photo-1621600411688-4be93cd68504?w=600',
            categoryId: createdCategories['gaming-keyboards'].id,
            quantity: 15,
            badge: 'Pro',
            specs: ['{format}: TKL', '{switch}: OmniPoint ajustables', '{ecran}: OLED', '{chassis}: Aluminium', '{marque}: SteelSeries']
        },
        {
            name: 'Corsair Vengeance RGB 32GB',
            description: 'Mémoire RAM DDR5 ultra rapide',
            price: 1899,
            originalPrice: null,
            image: 'https://images.unsplash.com/photo-1563143306-0cd4371465e9?w=600',
            categoryId: createdCategories['components'].id,
            quantity: 45,
            badge: 'Nouveau',
            specs: ['{type}: DDR5', '{capacite}: 32GB (2x16)', '{frequence}: 6000MHz', '{cas}: CL36', '{marque}: Corsair']
        },
        {
            name: 'Samsung 990 PRO 2TB',
            description: 'SSD NVMe PCIe 4.0 pour des temps de chargement instantanés',
            price: 2199,
            originalPrice: 2499,
            image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600',
            categoryId: createdCategories['components'].id,
            quantity: 35,
            badge: 'Vitesse',
            specs: ['{format}: M.2 NVMe', '{capacite}: 2TB', '{lecture}: 7450 MB/s', '{ecriture}: 6900 MB/s', '{marque}: Samsung']
        },
        {
            name: 'Razer DeathAdder V3 Pro',
            description: 'Souris ergonomique sans fil ultra-légère pour l\'eSport',
            price: 1799,
            originalPrice: null,
            image: 'https://images.unsplash.com/photo-1615663245857-ac93bb5c8143?w=600',
            categoryId: createdCategories['gaming-mice'].id,
            quantity: 25,
            badge: 'Bestseller',
            specs: ['{poids}: 63g', '{capteur}: Focus Pro 30K', '{polling}: 4000Hz (avec dongle)', '{boutons}: 5', '{marque}: Razer']
        },
        {
            name: 'Elgato Stream Deck MK.2',
            description: 'Contrôleur de création avec 15 touches LCD',
            price: 1699,
            originalPrice: null,
            image: 'https://images.unsplash.com/photo-1626242397127-142270921008?w=600',
            categoryId: createdCategories['it-accessories'].id,
            quantity: 20,
            badge: 'Streamer',
            specs: ['{touches}: 15 LCD', '{connexion}: USB-C', '{support}: Amovible', '{plugins}: Illimités', '{marque}: Elgato']
        },
        {
            name: 'ASUS ROG Zephyrus G14',
            description: 'PC Portable Gamer ultra-fin et puissant',
            price: 19999,
            originalPrice: 22499,
            image: 'https://images.unsplash.com/photo-1593642702821-c823b2816291?w=600',
            categoryId: createdCategories['laptops'].id,
            quantity: 12,
            badge: 'Design',
            specs: ['{cpu}: Ryzen 9', '{gpu}: RTX 4060', '{ram}: 16GB', '{ecran}: 14" QHD', '{marque}: ASUS']
        },
        {
            name: 'Sony INZONE H9',
            description: 'Casque gamer avec réduction de bruit active',
            price: 2999,
            originalPrice: null,
            image: 'https://images.unsplash.com/photo-1612444530582-fc66183b16f7?w=600',
            categoryId: createdCategories['gaming-headsets'].id,
            quantity: 18,
            badge: 'PS5 & PC',
            specs: ['{anc}: Oui', '{audio}: 360 Spatial Sound', '{autonomie}: 32h', '{connexion}: Bluetooth & 2.4GHz', '{marque}: Sony']
        },
        {
            name: 'LG UltraGear 27GN950-B',
            description: 'Écran Gamer 4K Nano IPS 144Hz',
            price: 8499,
            originalPrice: 9999,
            image: 'https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=600',
            categoryId: createdCategories['gaming-monitors'].id,
            quantity: 8,
            badge: '4K',
            specs: ['{resolution}: 4K UHD', '{dalle}: Nano IPS', '{taux}: 144Hz', '{hdr}: VESA DisplayHDR 600', '{marque}: LG']
        },
        {
            name: 'NZXT Kraken Elite 360',
            description: 'Watercooling AIO avec écran LCD personnalisable',
            price: 3299,
            originalPrice: null,
            image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=600',
            categoryId: createdCategories['components'].id,
            quantity: 10,
            badge: 'Modding',
            specs: ['{taille}: 360mm', '{ventilateurs}: 3x F120P', '{ecran}: LCD 2.36"', '{pompe}: Asetek 7th Gen', '{marque}: NZXT']
        },
        {
            name: 'Secretlab TITAN Evo',
            description: 'Chaise Gamer ergonomique de qualité supérieure',
            price: 5499,
            originalPrice: 5999,
            image: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=600',
            categoryId: createdCategories['it-accessories'].id,
            quantity: 14,
            badge: 'Confort',
            specs: ['{revetement}: Tissu SoftWeave', '{support}: Lombaire réglable', '{accoudoirs}: 4D magnétiques', '{taille}: Regular', '{marque}: Secretlab']
        }
    ];

    for (const prod of productsData) {
        // We use name as a matching key for seeding since IDs change
        const existing = await prisma.product.findFirst({ where: { name: prod.name } });
        if (existing) {
            await prisma.product.update({
                where: { id: existing.id },
                data: prod
            });
        } else {
            await prisma.product.create({
                data: {
                    ...prod,
                    inStock: prod.quantity > 0
                }
            });
        }
        console.log(`   ✅ ${prod.name}`);
    }

    // 7. Seed Procurements (Crucial for WAC & Profit Calculation)
    console.log('📦 Seeding procurements (for profit analytics)...');
    const allSeededProducts = await prisma.product.findMany();

    for (const product of allSeededProducts) {
        // Check if procurement exists
        const existingProcurement = await prisma.procurement.findFirst({
            where: { productId: product.id }
        });

        if (!existingProcurement) {
            // Estimate cost price (e.g., 80% of selling price)
            const estimatedCost = Math.round(product.price * 0.8);

            await prisma.procurement.create({
                data: {
                    productId: product.id,
                    quantityPurchased: product.quantity, // Initial stock from procurement
                    unitCostPrice: estimatedCost,
                    totalCost: estimatedCost * product.quantity,
                    supplierId: mainSupplier.id,
                    purchaseDate: new Date()
                }
            });
            console.log(`   ✅ Procurement added for: ${product.name} (Cost: ${estimatedCost})`);
        }
    }
    console.log('');

    // 6. Seed Hero Slides
    console.log('\n🎞️ Seeding hero slides...');
    const slides = [
        {
            title: 'Dominez le Champ de Bataille',
            subtitle: 'PROMOTIONS EXCLUSIVES',
            description: 'PCs Gaming haute performance configurés pour la victoire. Jusqu\'à -20% sur la série RTX Elite.',
            image: 'https://images.unsplash.com/photo-1587202376732-834907a75932?q=80&w=2070&auto=format&fit=crop',
            buttonText: 'Acheter Maintenant',
            buttonLink: '/products',
            badge: 'Offre Limitée',
            order: 0,
            active: true
        }
    ];

    for (const slide of slides) {
        const existing = await prisma.heroSlide.findFirst({ where: { title: slide.title } });
        if (existing) {
            await prisma.heroSlide.update({ where: { id: existing.id }, data: slide });
        } else {
            await prisma.heroSlide.create({ data: slide });
        }
    }
    console.log('   ✅ Hero slides updated');

    console.log('\n✨ Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
