import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Gamepad2, Zap, Trophy, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { heroSlidesApi } from '@/api/hero-slides';
import { settingsApi } from '@/api/settings';
import { useQuery } from '@tanstack/react-query';
import { getImageUrl } from '@/lib/image-utils';

const DEFAULT_SLIDES = [
    {
        image: 'https://images.unsplash.com/photo-1587202376732-834907a75932?q=80&w=2070&auto=format&fit=crop',
        title: 'Dominez le Champ de Bataille',
        subtitle: 'PROMOTIONS EXCLUSIVES',
        description: 'PCs Gaming haute performance configurés pour la victoire. Jusqu\'à -20% sur la série RTX Elite.',
        buttonText: 'Acheter Maintenant',
        buttonLink: '/products',
        badge: 'Offre Limitée',
        color: 'from-blue-600/20'
    },
    {
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
        title: 'Précision Ultime',
        subtitle: 'NOUVEAUX PACKS',
        description: 'Découvrez nos packs périphériques : Clavier Mécanique + Souris RGB + Tapis XL à prix réduit.',
        buttonText: 'Voir les Packs',
        buttonLink: '/products',
        badge: 'Nouveau',
        color: 'from-purple-600/20'
    },
    {
        image: 'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?q=80&w=2071&auto=format&fit=crop',
        title: 'Immersion Totale',
        subtitle: 'EXPERIENCE GAMING',
        description: 'Écrans incurvés 240Hz et casques audio 7.1 pour une immersion sans précédent.',
        buttonText: 'Découvrir',
        buttonLink: '/products',
        badge: 'Premium',
        color: 'from-red-600/20'
    }
];

export const HeroCarousel = () => {
    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: settingsApi.get,
    });

    const { data: remoteSlides = [] } = useQuery({
        queryKey: ['hero-slides'],
        queryFn: heroSlidesApi.getAll,
    });

    const slides = remoteSlides.length > 0 ? remoteSlides.map(s => ({
        ...s,
        image: getImageUrl(s.image) || s.image,
        color: 'from-primary/20' // Default theme color
    })) : DEFAULT_SLIDES;

    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 30 });
    const [selectedIndex, setSelectedIndex] = useState(0);

    const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi, setSelectedIndex]);

    useEffect(() => {
        if (!emblaApi) return;

        let autoplayId: ReturnType<typeof setInterval>;
        let resumeTimeoutId: ReturnType<typeof setTimeout>;

        const interval = settings?.homeHeroAutoPlayInterval || 5000;

        const startAutoplay = () => {
            stopAutoplay();
            autoplayId = setInterval(() => {
                emblaApi.scrollNext();
            }, interval);
        };

        const stopAutoplay = () => {
            clearInterval(autoplayId);
        };

        const onInteraction = () => {
            stopAutoplay();
            clearTimeout(resumeTimeoutId);
            // Resume after the configured interval + 2 seconds buffer
            resumeTimeoutId = setTimeout(startAutoplay, interval + 2000);
        };

        onSelect();
        emblaApi.on('select', onSelect);

        // Listen for user interactions (dragging, clicking)
        emblaApi.on('pointerDown', stopAutoplay);
        emblaApi.on('pointerUp', onInteraction);
        // Also captures when scroll settles (even if from buttons)
        emblaApi.on('settle', onInteraction);

        startAutoplay();

        return () => {
            stopAutoplay();
            clearTimeout(resumeTimeoutId);
            emblaApi.off('select', onSelect);
            emblaApi.off('pointerDown', stopAutoplay);
            emblaApi.off('pointerUp', onInteraction);
            emblaApi.off('settle', onInteraction);
        };
    }, [emblaApi, onSelect, settings]);

    return (
        <div className="dark">
            <div className="relative h-[550px] sm:h-[650px] md:h-[85vh] lg:h-[90vh] w-full overflow-hidden bg-[#070708] pt-16 md:pt-20">
                <div className="overflow-hidden h-full" ref={emblaRef}>
                    <div className="flex h-full">
                        {slides.map((slide, index) => (
                            <div key={index} className="relative flex-[0_0_100%] min-w-0 h-full pl-0">
                                {/* Background Image with Overlay */}
                                <div className="absolute inset-0 z-0">
                                    <img
                                        src={slide.image}
                                        alt={slide.title}
                                        className="w-[101%] h-full max-w-none object-cover object-top sm:object-center transition-transform duration-[10s] scale-105 hover:scale-100"
                                        style={{ filter: `blur(${settings?.homeHeroBlur ?? 0}px)` }}
                                    />
                                    <div
                                        className={`absolute inset-0 bg-gradient-to-r ${slide.color || 'from-[#070708]/80'} via-[#070708]/80 to-[#070708]/40 z-10`}
                                        style={{ opacity: (settings?.homeHeroOverlayOpacity ?? 80) / 100 }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#070708] via-transparent to-transparent z-10" />
                                </div>

                                {/* Content */}
                                <div className="container-custom relative z-20 h-full flex flex-col pt-24 sm:pt-32 md:pt-40 lg:pt-48 pb-10 md:pb-16 max-h-full">
                                    <div className="max-w-5xl text-left flex-1 flex flex-col">
                                        <AnimatePresence mode="wait">
                                            {selectedIndex === index && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 20 }}
                                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                                    className="flex-1 flex flex-col"
                                                >
                                                    <div className="flex-none">
                                                        <div className="flex items-center justify-start gap-3 md:gap-4 mb-4 md:mb-6 flex-wrap">
                                                            {slide.badge && (
                                                                <div className="relative group">
                                                                    <div className="absolute inset-0 bg-primary blur-lg opacity-60 group-hover:opacity-100 transition-opacity" />
                                                                    <span className="relative px-4 py-1.5 md:px-5 md:py-2 bg-primary text-white text-xs md:text-sm font-black uppercase tracking-[0.25em] rounded-md transform -skew-x-12 inline-block border-l-4 border-white shadow-2xl">
                                                                        <span className="transform skew-x-12 inline-block">
                                                                            {slide.badge}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {slide.subtitle && (
                                                                <span className="text-white tracking-[0.25em] text-xs md:text-sm font-bold uppercase bg-zinc-900/90 backdrop-blur-sm px-4 py-1.5 md:px-5 md:py-2 rounded-md border border-zinc-700 shadow-lg">
                                                                    {slide.subtitle}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] font-black mb-4 md:mb-6 leading-[1.05] tracking-tight text-white max-w-full sm:max-w-none" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)' }}>
                                                            {(() => {
                                                                const text = slide.title || '';
                                                                const lines = text.split(/\r?\n/);
                                                                const result = [];
                                                                let inHighlight = false;
                                                                let totalWordIndex = 0;

                                                                for (let l = 0; l < lines.length; l++) {
                                                                    const words = lines[l].split(/\s+/).filter(Boolean);
                                                                    for (let i = 0; i < words.length; i++) {
                                                                        let word = words[i];
                                                                        let isHighlight = false;

                                                                        if (text.includes('*')) {
                                                                            if (word.startsWith('*') && word.endsWith('*') && word.length > 1) {
                                                                                word = word.slice(1, -1);
                                                                                isHighlight = true;
                                                                            } else if (word.startsWith('*')) {
                                                                                inHighlight = true;
                                                                                word = word.slice(1);
                                                                                isHighlight = true;
                                                                            } else if (word.endsWith('*')) {
                                                                                word = word.slice(0, -1);
                                                                                isHighlight = true;
                                                                                inHighlight = false;
                                                                            } else {
                                                                                isHighlight = inHighlight;
                                                                            }
                                                                        } else {
                                                                            isHighlight = (totalWordIndex === 1);
                                                                        }

                                                                        result.push(
                                                                            <span key={`word-${l}-${i}`} className={isHighlight ? "text-primary" : ""}>
                                                                                {word}{' '}
                                                                            </span>
                                                                        );
                                                                        totalWordIndex++;
                                                                    }
                                                                    if (l < lines.length - 1) {
                                                                        result.push(<br key={`br-${l}`} />);
                                                                    }
                                                                }
                                                                return result;
                                                            })()}
                                                        </h1>

                                                        {slide.description && (
                                                            <p className="text-base md:text-xl text-white font-semibold leading-relaxed line-clamp-2 md:line-clamp-none mb-6 md:mb-8 max-w-2xl" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.6)' }}>
                                                                {slide.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex-none mt-auto pt-4 md:pt-8">
                                                        <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start justify-start">
                                                            <Link to={slide.buttonLink} className="w-full sm:w-auto">
                                                                <Button variant="gaming" size="xl" className="w-full sm:w-auto px-10">
                                                                    {slide.buttonText}
                                                                    <ArrowRight />
                                                                </Button>
                                                            </Link>
                                                            <Link to="/products" className="w-full sm:w-auto">
                                                                <Button
                                                                    size="xl"
                                                                    variant="outline"
                                                                    className="w-full sm:w-auto border-white/20 bg-white/5 backdrop-blur-sm hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 group"
                                                                >
                                                                    <ShoppingBag className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                                                    Découvrir la Boutique
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </div>

                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="hidden md:flex absolute bottom-10 right-10 z-30 gap-4">
                    <button
                        onClick={scrollPrev}
                        className="w-12 h-12 rounded-full border border-zinc-800 bg-[#070708]/50 backdrop-blur-md flex items-center justify-center text-zinc-100 hover:bg-primary hover:text-white hover:border-primary transition-all group"
                    >
                        <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={scrollNext}
                        className="w-12 h-12 rounded-full border border-zinc-800 bg-[#070708]/50 backdrop-blur-md flex items-center justify-center text-zinc-100 hover:bg-primary hover:text-white hover:border-primary transition-all group"
                    >
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Pagination indicators */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex gap-3">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => emblaApi?.scrollTo(index)}
                            className={`h-1.5 transition-all duration-300 rounded-full ${selectedIndex === index ? 'w-10 bg-primary' : 'bg-zinc-800/50 hover:bg-zinc-800 w-2'
                                }`}
                        />
                    ))}
                </div>

                {/* Decorative element */}
                <div className="absolute top-1/4 -right-20 w-96 h-96 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
            </div>
        </div>
    );
};
