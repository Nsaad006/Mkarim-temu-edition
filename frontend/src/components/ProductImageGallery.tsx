import { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { Button } from './ui/button';
import { getImageUrl } from '@/lib/image-utils';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductImageGalleryProps {
    images: string[];
    productName: string;
    badge?: string;
}

export function ProductImageGallery({ images, productName, badge }: ProductImageGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    const imageList = images && images.length > 0 ? images : [];

    if (imageList.length === 0) {
        return (
            <div className="relative aspect-square rounded-xl overflow-hidden bg-card border border-border flex items-center justify-center">
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

    return (
        <div className="flex flex-col-reverse md:flex-row gap-3">

            {/* Thumbnails — always on desktop (left), on mobile only if >1 image (bottom) */}
            <div className={`${imageList.length === 1 ? 'hidden md:flex' : 'flex'} flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent md:max-h-[568px] shrink-0 pb-1 md:pb-0`}>
                {imageList.map((image, index) => (
                    <button
                        key={index}
                        onClick={() => setSelectedIndex(index)}
                        className={`flex-shrink-0 w-[70px] h-[70px] md:w-[88px] md:h-[88px] rounded-lg overflow-hidden border-2 transition-all ${
                            index === selectedIndex
                                ? 'border-primary ring-2 ring-primary/20'
                                : 'border-border hover:border-primary/50 opacity-60 hover:opacity-100'
                        }`}
                    >
                        <img
                            src={getImageUrl(image)}
                            alt={`${productName} ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                    </button>
                ))}
            </div>

            {/* Main Image */}
            <div className="relative flex-1 min-w-0">
                <div
                    className="relative rounded-xl overflow-hidden cursor-pointer group w-full"
                    style={{ aspectRatio: '1 / 1', maxHeight: '640px' }}
                    onClick={() => setIsLightboxOpen(true)}
                >
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={selectedIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            src={getImageUrl(imageList[selectedIndex])}
                            alt={`${productName} - Image ${selectedIndex + 1}`}
                            className="w-full h-full object-cover"
                        />
                    </AnimatePresence>

                    {/* Magnifier hint */}
                    <div className="absolute top-3 right-3 p-1.5 bg-background/60 backdrop-blur-sm rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 className="w-4 h-4 text-foreground" />
                    </div>

                    {/* Badge */}
                    {badge && (
                        <span className="absolute top-3 left-3 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full z-10">
                            {badge}
                        </span>
                    )}

                    {/* Navigation Arrows */}
                    {imageList.length > 1 && (
                        <>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full shadow-lg z-20 h-8 w-8 bg-background/80 hover:bg-background"
                                onClick={handlePrevious}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full shadow-lg z-20 h-8 w-8 bg-background/80 hover:bg-background"
                                onClick={handleNext}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </>
                    )}

                    {/* Image Counter */}
                    {imageList.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs font-medium z-20 border border-border">
                            {selectedIndex + 1} / {imageList.length}
                        </div>
                    )}
                </div>
            </div>

            {/* Lightbox Dialog */}
            <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-transparent border-none shadow-none flex items-center justify-center [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-white/10 [&>button]:h-10 [&>button]:w-10 [&>button]:rounded-full">
                    <DialogTitle className="sr-only">Vue agrandie du produit</DialogTitle>
                    <DialogDescription className="sr-only">
                        Affichage en plein écran de l'image de {productName}
                    </DialogDescription>

                    <div className="relative w-full h-full flex items-center justify-center">
                        <button
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                            onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                        <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>

                        <motion.img
                            key={`lightbox-${selectedIndex}`}
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
