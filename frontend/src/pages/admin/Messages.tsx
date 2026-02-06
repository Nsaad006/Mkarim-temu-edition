import { useState } from "react";
import {
    Search,
    Mail,
    Phone,
    Trash2,
    Eye,
    MessageCircle,
    Loader2,
    CheckCircle2,
    Clock
} from "lucide-react";
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactsApi, Contact } from "@/api/contacts";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Pagination } from "@/components/admin/Pagination";

const Messages = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMessage, setSelectedMessage] = useState<Contact | null>(null);

    const queryClient = useQueryClient();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const { data: messages = [], isLoading } = useQuery({
        queryKey: ['admin-messages'],
        queryFn: () => contactsApi.getAll(),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            contactsApi.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => contactsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
            toast({
                title: "Message supprimé",
                description: "Le message a été supprimé avec succès.",
            });
        }
    });

    const filteredMessages = messages.filter((msg) =>
        msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (msg.subject || "").toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Apply pagination
    const totalPages = Math.ceil(filteredMessages.length / pageSize);
    const paginatedMessages = filteredMessages.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const handleViewMessage = (msg: Contact) => {
        setSelectedMessage(msg);
        if (msg.status === 'NEW') {
            updateStatusMutation.mutate({ id: msg.id, status: 'READ' });
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce message ?")) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Messages / Contact</h1>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="mb-6 max-w-sm relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher nom, email, sujet..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="whitespace-nowrap">Status</TableHead>
                                <TableHead className="whitespace-nowrap">Expéditeur</TableHead>
                                <TableHead className="whitespace-nowrap">Sujet</TableHead>
                                <TableHead className="whitespace-nowrap">Date</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Chargement des messages...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedMessages.length > 0 ? (
                                paginatedMessages.map((msg) => (
                                    <TableRow key={msg.id} className={`hover:bg-muted/50 ${msg.status === 'NEW' ? 'bg-primary/5 font-medium' : ''}`}>
                                        <TableCell>
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                {msg.status === 'NEW' ? (
                                                    <span className="w-2 h-2 rounded-full bg-primary" title="Nouveau" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                                                )}
                                                <span className="text-xs uppercase text-muted-foreground">{msg.status}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="whitespace-nowrap">{msg.name}</span>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">{msg.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {msg.subject || "(Sans sujet)"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                            {new Date(msg.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-2">
                                                <Sheet>
                                                    <SheetTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => handleViewMessage(msg)}>
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </SheetTrigger>
                                                    <SheetContent className="overflow-y-auto sm:max-w-xl">
                                                        <SheetHeader className="mb-6">
                                                            <SheetTitle className="text-2xl">Détails du Message</SheetTitle>
                                                            <SheetDescription>
                                                                Message envoyé par {msg.name} le {new Date(msg.createdAt).toLocaleString()}
                                                            </SheetDescription>
                                                        </SheetHeader>

                                                        <div className="space-y-6">
                                                            <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/50 rounded-lg border border-border">
                                                                <div>
                                                                    <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Email</p>
                                                                    <a href={`mailto:${msg.email}`} className="text-sm font-medium hover:text-primary flex items-center gap-2">
                                                                        <Mail className="w-3 h-3" /> {msg.email}
                                                                    </a>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Téléphone</p>
                                                                    {msg.phone ? (
                                                                        <a href={`tel:${msg.phone}`} className="text-sm font-medium hover:text-primary flex items-center gap-2">
                                                                            <Phone className="w-3 h-3" /> {msg.phone}
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-sm text-muted-foreground">Non renseigné</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Sujet</p>
                                                                <p className="font-semibold text-lg">{msg.subject || "(Sans sujet)"}</p>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Message</p>
                                                                <div className="p-4 bg-card border rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                                                                    {msg.message}
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-3">
                                                                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => window.open(`https://wa.me/${msg.phone?.replace(/\s+/g, '')}`, "_blank")}>
                                                                    <MessageCircle className="w-4 h-4 mr-2" /> Répondre WhatsApp
                                                                </Button>
                                                                <Button className="flex-1" variant="outline" onClick={() => window.open(`mailto:${msg.email}`)}>
                                                                    <Mail className="w-4 h-4 mr-2" /> Répondre par Email
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </SheetContent>
                                                </Sheet>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(msg.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Aucun message trouvé.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                }}
                totalItems={filteredMessages.length}
            />
        </div>
    );
};

export default Messages;
