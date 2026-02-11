import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { Button } from './ui/button';
import { getImageUrl } from '@/lib/image-utils';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from './ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductImageGalleryProps {
    images: string[];
    productName: string;
    badge?: string;
}

export function ProductImageGallery({ images, productName, badge }: ProductImageGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Ensure we have at least one image
    const imageList = images && images.length > 0 ? images : [];

    if (imageList.length === 0) {
        return (
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border flex items-center justify-center">
                <p className="text-muted-foreground">Aucune image disponible</p>
            </div>
        );
    }

    const handlePrevious = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const { left, top, width, height } = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        setMousePos({ x, y });
    };

    return (
        <div className="space-y-4">
            {/* Main Image Container */}
            <div className="relative overflow-hidden">
                <div
                    ref={containerRef}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border cursor-zoom-in group"
                    onMouseEnter={() => {
                        if (window.innerWidth >= 1024) setIsZoomed(true);
                    }}
                    onMouseLeave={() => setIsZoomed(false)}
                    onMouseMove={(e) => {
                        if (window.innerWidth >= 1024) handleMouseMove(e);
                    }}
                    onClick={() => setIsLightboxOpen(true)}
                >
                    <motion.img
                        key={selectedIndex}
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: 1,
                            scale: (isZoomed && window.innerWidth >= 1024) ? 2 : 1,
                            x: (isZoomed && window.innerWidth >= 1024) ? `${(50 - mousePos.x) * 0.5}%` : 0,
                            y: (isZoomed && window.innerWidth >= 1024) ? `${(50 - mousePos.y) * 0.5}%` : 0,
                        }}
                        transition={{
                            opacity: { duration: 0.3 },
                            scale: { duration: 0.1 },
                            x: { duration: 0.1 },
                            y: { duration: 0.1 }
                        }}
                        src={getImageUrl(imageList[selectedIndex])}
                        alt={`${productName} - Image ${selectedIndex + 1}`}
                        className="w-full h-full object-cover origin-center"
                    />

                    {/* Magnifier Icon - Desktop Only */}
                    <div className="absolute top-4 right-4 p-2 bg-background/50 backdrop-blur-md rounded-full shadow-lg opacity-0 md:group-hover:opacity-100 transition-opacity hidden md:block">
                        <Maximize2 className="w-5 h-5 text-foreground" />
                    </div>

                    {/* Badge */}
                    {badge && (
                        <span className="absolute top-4 left-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-full z-10">
                            {badge}
                        </span>
                    )}

                    {/* Navigation Arrows (only if multiple images) */}
                    {imageList.length > 1 && (
                        <>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg z-20 hover:bg-background transition-opacity"
                                onClick={handlePrevious}
                                onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    setIsZoomed(false);
                                }}
                                onMouseLeave={() => {
                                    if (window.innerWidth >= 1024) setIsZoomed(true);
                                }}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg z-20 hover:bg-background transition-opacity"
                                onClick={handleNext}
                                onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    setIsZoomed(false);
                                }}
                                onMouseLeave={() => {
                                    if (window.innerWidth >= 1024) setIsZoomed(true);
                                }}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </>
                    )}

                    {/* Image Counter */}
                    {imageList.length > 1 && (
                        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium z-20 border border-border transition-opacity ${(isZoomed && window.innerWidth >= 1024) ? 'opacity-0' : 'opacity-100'}`}>
                            {selectedIndex + 1} / {imageList.length}
                        </div>
                    )}
                </div>
            </div>

            {/* Thumbnail Strip */}
            {imageList.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                    {imageList.map((image, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedIndex(index)}
                            className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${index === selectedIndex
                                ? 'border-primary ring-2 ring-primary/20'
                                : 'border-border hover:border-primary/50'
                                }`}
                        >
                            <img
                                src={getImageUrl(image)}
                                alt={`${productName} thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Lightbox Dialog */}
            <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-transparent border-none shadow-none flex items-center justify-center [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-white/10 [&>button]:h-10 [&>button]:w-10 [&>button]:rounded-full">
                    {/* Accessibility requirements */}
                    <DialogTitle className="sr-only">Vue agrandie du produit</DialogTitle>
                    <DialogDescription className="sr-only">
                        Affichage en plein écran de l'image de {productName}
                    </DialogDescription>

                    <div className="relative w-full h-full flex items-center justify-center">

                        <button
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrevious();
                            }}
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>

                        <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNext();
                            }}
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>

                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={getImageUrl(imageList[selectedIndex])}
                            alt={productName}
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
