import { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import apiClient from '@/lib/api-client';
import { getImageUrl } from '@/lib/image-utils';

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    disabled?: boolean;
    compact?: boolean;
}

export function ImageUpload({ value, onChange, disabled, compact }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('La taille du fichier ne doit pas dépasser 5MB');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Veuillez sélectionner une image valide');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);

            const { data } = await apiClient.post('/api/upload/product-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            onChange(data.imageUrl);
        } catch (error: any) {
            console.error('Upload error:', error);
            alert(error.response?.data?.error || 'Erreur lors du téléchargement de l\'image');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            {value ? (
                <div className="relative">
                    <img
                        src={getImageUrl(value)}
                        alt="Product"
                        className={`w-full object-cover rounded-lg border border-border ${compact ? 'h-24' : 'h-48'}`}
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => onChange('')}
                        disabled={disabled}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors ${compact ? 'h-24' : 'h-48'}`}>
                    <div className={`flex flex-col items-center justify-center ${compact ? 'gap-1 py-2' : 'pt-5 pb-6'}`}>
                        {isUploading ? (
                            <>
                                <Loader2 className={`text-primary animate-spin ${compact ? 'w-6 h-6' : 'w-10 h-10 mb-2'}`} />
                                <p className="text-xs text-muted-foreground">Téléchargement...</p>
                            </>
                        ) : (
                            <>
                                <Upload className={`text-muted-foreground ${compact ? 'w-5 h-5' : 'w-10 h-10 mb-2'}`} />
                                <p className={`text-muted-foreground font-medium ${compact ? 'text-xs' : 'text-sm'}`}>Cliquez pour télécharger</p>
                                <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP (max 5MB)</p>
                            </>
                        )}
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={disabled || isUploading}
                    />
                </label>
            )}
        </div>
    );
}
