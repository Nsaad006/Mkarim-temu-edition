import { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import apiClient from '@/lib/api-client';
import { getImageUrl } from '@/lib/image-utils';

interface MultiImageUploadProps {
    value: string[];
    onChange: (urls: string[]) => void;
    disabled?: boolean;
    maxImages?: number;
}

export function MultiImageUpload({
    value = [],
    onChange,
    disabled,
    maxImages = 10
}: MultiImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Check max images
        if (value.length + files.length > maxImages) {
            alert(`Maximum ${maxImages} images autorisées`);
            return;
        }

        // Validate each file
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name}: La taille ne doit pas dépasser 5MB`);
                return;
            }
            if (!file.type.startsWith('image/')) {
                alert(`${file.name}: Veuillez sélectionner une image valide`);
                return;
            }
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            files.forEach(file => formData.append('images', file));

            const { data } = await apiClient.post('/api/upload/product-images', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            onChange([...value, ...data.imageUrls]);
        } catch (error: any) {
            console.error('Upload error:', error);
            alert(error.response?.data?.error || 'Erreur lors du téléchargement des images');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = (index: number) => {
        const newImages = value.filter((_, i) => i !== index);
        onChange(newImages);
    };

    const handleReorder = (fromIndex: number, toIndex: number) => {
        const newImages = [...value];
        const [removed] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, removed);
        onChange(newImages);
    };

    return (
        <div className="space-y-4">
            {/* Existing Images */}
            {value.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {value.map((url, index) => (
                        <div key={index} className="relative group">
                            <img
                                src={getImageUrl(url)}
                                alt={`Product ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border border-border"
                            />
                            {index === 0 && (
                                <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                                    Principale
                                </span>
                            )}
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemove(index)}
                                disabled={disabled}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                            {value.length > 1 && (
                                <div className="absolute bottom-2 left-2 flex gap-1">
                                    {index > 0 && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="icon"
                                            className="h-6 w-6 text-xs"
                                            onClick={() => handleReorder(index, index - 1)}
                                            disabled={disabled}
                                            title="Déplacer à gauche"
                                        >
                                            ←
                                        </Button>
                                    )}
                                    {index < value.length - 1 && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="icon"
                                            className="h-6 w-6 text-xs"
                                            onClick={() => handleReorder(index, index + 1)}
                                            disabled={disabled}
                                            title="Déplacer à droite"
                                        >
                                            →
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Button */}
            {value.length < maxImages && (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
                    <div className="flex flex-col items-center justify-center">
                        {isUploading ? (
                            <>
                                <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                                <p className="text-sm text-muted-foreground">Téléchargement...</p>
                            </>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground font-medium">
                                    Cliquez pour télécharger ({value.length}/{maxImages})
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    PNG, JPG, WEBP (max 5MB chacune)
                                </p>
                            </>
                        )}
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        disabled={disabled || isUploading}
                    />
                </label>
            )}
        </div>
    );
}
