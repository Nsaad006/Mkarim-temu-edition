import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ImageUpload";
import { Plus, Trash2, GripVertical, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { heroSlidesApi, HeroSlide, CreateHeroSlide } from "@/api/hero-slides";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

interface HeroSlideManagerProps {
    onSlidesChange?: (slides: Record<string, Partial<HeroSlide>>) => void;
    onHasChanges?: (hasChanges: boolean) => void;
}

export const HeroSlideManager = ({ onSlidesChange, onHasChanges }: HeroSlideManagerProps) => {
    const queryClient = useQueryClient();
    const [editedSlides, setEditedSlides] = useState<Record<string, Partial<HeroSlide>>>({});

    const { data: slides = [], isLoading } = useQuery({
        queryKey: ['hero-slides-admin'],
        queryFn: () => heroSlidesApi.getAllAdmin(),
    });

    // Notify parent of changes
    useEffect(() => {
        if (onSlidesChange) {
            onSlidesChange(editedSlides);
        }
        if (onHasChanges) {
            onHasChanges(Object.keys(editedSlides).length > 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editedSlides]);

    const createMutation = useMutation({
        mutationFn: (data: CreateHeroSlide) => heroSlidesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hero-slides-admin'] });
            toast({ title: "Slide ajouté" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => heroSlidesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hero-slides-admin'] });
            toast({ title: "Slide supprimé" });
        }
    });

    const addNewSlide = () => {
        createMutation.mutate({
            title: "Nouveau Slide",
            subtitle: "Subtitle",
            description: "Description",
            image: "",
            buttonText: "Acheter Maintenant",
            buttonLink: "/products",
            badge: "Nouveau",
            order: slides.length,
            active: true
        });
    };

    const updateSlideField = (slideId: string, field: string, value: any) => {
        setEditedSlides(prev => ({
            ...prev,
            [slideId]: {
                ...prev[slideId],
                [field]: value
            }
        }));
    };

    const getSlideValue = (slide: HeroSlide, field: keyof HeroSlide) => {
        if (editedSlides[slide.id] && field in editedSlides[slide.id]) {
            return editedSlides[slide.id][field];
        }
        return slide[field];
    };

    const moveSlide = async (slideId: string, direction: 'up' | 'down') => {
        const slide = slides.find(s => s.id === slideId);
        if (!slide) return;

        const targetOrder = direction === 'up' ? slide.order - 1 : slide.order + 1;
        const targetSlide = slides.find(s => s.order === targetOrder);

        if (!targetSlide) return;

        try {
            // Swap orders immediately
            await Promise.all([
                heroSlidesApi.update(slide.id, { order: targetOrder }),
                heroSlidesApi.update(targetSlide.id, { order: slide.order })
            ]);
            queryClient.invalidateQueries({ queryKey: ['hero-slides-admin'] });
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Impossible de réorganiser les slides",
                variant: "destructive"
            });
        }
    };

    // Expose method to save all changes (called by parent)
    useEffect(() => {
        (window as any).__saveHeroSlides = async () => {
            const promises = Object.entries(editedSlides).map(([id, data]) =>
                heroSlidesApi.update(id, data)
            );
            await Promise.all(promises);
            setEditedSlides({});
            queryClient.invalidateQueries({ queryKey: ['hero-slides-admin'] });
        };
        return () => {
            delete (window as any).__saveHeroSlides;
        };
    }, [editedSlides, queryClient]);

    if (isLoading) return <Loader2 className="animate-spin mx-auto" />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Gestion des Slides (Hero)</h2>
                <Button onClick={addNewSlide} disabled={createMutation.isPending}>
                    <Plus className="w-4 h-4 mr-2" /> Ajouter un slide
                </Button>
            </div>

            <div className="space-y-4">
                {slides.map((slide) => (
                    <Card key={slide.id} className="border-border bg-card/50">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <GripVertical className="text-muted-foreground w-5 h-5" />
                                    <span className="font-bold">Slide #{slide.order + 1}</span>
                                    <div className="flex items-center gap-1 ml-4 border-l pl-4">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            disabled={slide.order === 0}
                                            onClick={() => moveSlide(slide.id, 'up')}
                                        >
                                            <ArrowUp className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            disabled={slide.order === slides.length - 1}
                                            onClick={() => moveSlide(slide.id, 'down')}
                                        >
                                            <ArrowDown className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={getSlideValue(slide, 'active') as boolean}
                                        onCheckedChange={(checked) => updateSlideField(slide.id, 'active', checked)}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(slide.id)} className="text-destructive">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Image du Slide</Label>
                                        <ImageUpload
                                            value={getSlideValue(slide, 'image') as string}
                                            onChange={(url) => updateSlideField(slide.id, 'image', url)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Badge (ex: Nouveau, -20%)</Label>
                                        <Input
                                            value={getSlideValue(slide, 'badge') as string || ""}
                                            onChange={(e) => updateSlideField(slide.id, 'badge', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Titre</Label>
                                        <Textarea
                                            value={getSlideValue(slide, 'title') as string}
                                            onChange={(e) => updateSlideField(slide.id, 'title', e.target.value)}
                                            rows={2}
                                            className="resize-none"
                                        />
                                        <p className="text-xs text-muted-foreground">Appuyez sur "Entrée" pour sauter une ligne. Entourez des mots avec * pour les mettre en rouge (ex: Dominez *le Champ* de Bataille).</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Sous-titre</Label>
                                        <Input
                                            value={getSlideValue(slide, 'subtitle') as string || ""}
                                            onChange={(e) => updateSlideField(slide.id, 'subtitle', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            value={getSlideValue(slide, 'description') as string || ""}
                                            onChange={(e) => updateSlideField(slide.id, 'description', e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <Label>Texte Bouton</Label>
                                            <Input
                                                value={getSlideValue(slide, 'buttonText') as string}
                                                onChange={(e) => updateSlideField(slide.id, 'buttonText', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Lien Bouton</Label>
                                            <Input
                                                value={getSlideValue(slide, 'buttonLink') as string}
                                                onChange={(e) => updateSlideField(slide.id, 'buttonLink', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {slides.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                    <p className="text-muted-foreground">Aucun slide configuration. Ajoutez votre premier slide !</p>
                </div>
            )}
        </div>
    );
};
