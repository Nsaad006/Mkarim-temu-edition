import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, MapPin, Loader2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { citiesApi } from "@/api/cities";
import { City } from "@/api/cities";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext";

import { settingsApi } from "@/api/settings";

const Cities = () => {
    const { currency } = useSettings();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCity, setSelectedCity] = useState<City | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const queryClient = useQueryClient();

    // Free Shipping State
    const [freeShippingSettings, setFreeShippingSettings] = useState({
        enabled: false,
        threshold: 0
    });

    const [formData, setFormData] = useState({
        name: "",
        shippingFee: "",
        deliveryTime: "",
        active: true,
    });

    // Fetch global settings
    const { data: globalSettings } = useQuery({
        queryKey: ['settings'],
        queryFn: settingsApi.get,
    });

    // Update local state when settings load
    useEffect(() => {
        if (globalSettings) {
            setFreeShippingSettings({
                enabled: globalSettings.freeShippingEnabled || false,
                threshold: globalSettings.freeShippingThreshold || 0
            });
        }
    }, [globalSettings]);

    // Update settings mutation
    const settingsMutation = useMutation({
        mutationFn: (data: any) => settingsApi.update(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            toast({ title: "Paramètres mis à jour" });
        }
    });

    const handleSaveSettings = () => {
        settingsMutation.mutate({
            freeShippingEnabled: freeShippingSettings.enabled,
            freeShippingThreshold: freeShippingSettings.threshold
        });
    };

    // Fetch cities
    const { data: cities = [], isLoading } = useQuery({
        queryKey: ['admin-cities'],
        queryFn: () => citiesApi.getAll({ includeInactive: true }),
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: Omit<City, 'id'>) => citiesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-cities'] });
            toast({ title: "Ville ajoutée" });
            setIsDialogOpen(false);
            resetForm();
        }
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<City> }) => citiesApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-cities'] });
            toast({ title: "Ville modifiée" });
            setIsDialogOpen(false);
            resetForm();
        }
    });

    const filteredCities = cities.filter((city) =>
        city.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const resetForm = () => {
        setFormData({ name: "", shippingFee: "", deliveryTime: "", active: true });
        setSelectedCity(null);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const cityData = {
            name: formData.name,
            shippingFee: parseInt(formData.shippingFee),
            deliveryTime: formData.deliveryTime,
            active: formData.active,
        };

        if (selectedCity) {
            updateMutation.mutate({ id: selectedCity.id, data: cityData });
        } else {
            createMutation.mutate(cityData);
        }
    };

    const openEditDialog = (city: City) => {
        setSelectedCity(city);
        setFormData({
            name: city.name,
            shippingFee: city.shippingFee.toString(),
            deliveryTime: city.deliveryTime,
            active: city.active,
        });
        setIsDialogOpen(true);
    };

    const openCreateDialog = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const handleStatusToggle = (city: City) => {
        updateMutation.mutate({
            id: city.id,
            data: { active: !city.active }
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Villes & Livraison</h1>
                <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" /> Ajouter une Ville
                </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher une ville..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="whitespace-nowrap">Ville</TableHead>
                                    <TableHead className="whitespace-nowrap">Frais de Livraison</TableHead>
                                    <TableHead className="whitespace-nowrap">Délai Estimé</TableHead>
                                    <TableHead>Active</TableHead>
                                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCities.map((city) => (
                                    <TableRow key={city.id}>
                                        <TableCell className="font-medium flex items-center gap-2 whitespace-nowrap">
                                            <MapPin className="w-4 h-4 text-muted-foreground" />
                                            {city.name}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{city.shippingFee} {currency}</TableCell>
                                        <TableCell className="whitespace-nowrap">{city.deliveryTime}</TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={city.active}
                                                onCheckedChange={() => handleStatusToggle(city)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(city)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-card rounded-xl border border-border p-6">
                        <h3 className="font-semibold mb-4">Paramètres Généraux</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="free-shipping">Livraison Gratuite</Label>
                                <Switch
                                    id="free-shipping"
                                    checked={freeShippingSettings.enabled}
                                    onCheckedChange={(checked) => setFreeShippingSettings(prev => ({ ...prev, enabled: checked }))}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Activer la livraison gratuite pour toutes les commandes au-dessus d'un certain montant.
                            </p>

                            <div className="space-y-2">
                                <Label>Montant minimum ({currency})</Label>
                                <Input
                                    type="number"
                                    placeholder="500"
                                    value={freeShippingSettings.threshold}
                                    onChange={(e) => setFreeShippingSettings(prev => ({ ...prev, threshold: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleSaveSettings}
                                disabled={settingsMutation.isPending}
                            >
                                {settingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Sauvegarder
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedCity ? "Modifier Ville" : "Ajouter Ville"}</DialogTitle>
                        <DialogDescription>
                            Configurez les options de livraison pour cette ville.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nom de la ville</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Ex: Tanger"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Frais ({currency})</Label>
                                <Input
                                    type="number"
                                    value={formData.shippingFee}
                                    onChange={(e) => setFormData({ ...formData, shippingFee: e.target.value })}
                                    required
                                    placeholder="35"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Délai</Label>
                                <Input
                                    value={formData.deliveryTime}
                                    onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                                    placeholder="24h-48h"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Cities;
