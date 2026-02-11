import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@/data/mock-admin-data";
import { CheckCircle2, Clock, Truck, XCircle, RotateCcw } from "lucide-react";

interface StatusBadgeProps {
    status: OrderStatus | string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
    const getStatusConfig = (s: string) => {
        switch (s.toLowerCase()) {
            case "pending":
                return { color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200", icon: Clock, label: "En Attente" };
            case "confirmed":
                return { color: "bg-blue-100 text-blue-800 hover:bg-blue-200", icon: CheckCircle2, label: "Confirmée" };
            case "shipped":
                return { color: "bg-purple-100 text-purple-800 hover:bg-purple-200", icon: Truck, label: "Expédiée" };
            case "delivered":
                return { color: "bg-green-100 text-green-800 hover:bg-green-200", icon: CheckCircle2, label: "Livrée" };
            case "cancelled":
                return { color: "bg-red-100 text-red-800 hover:bg-red-200", icon: XCircle, label: "Annulée" };
            case "returned":
                return { color: "bg-gray-100 text-gray-800 hover:bg-gray-200", icon: RotateCcw, label: "Retournée" };
            case "retour":
                return { color: "bg-orange-100 text-orange-800 hover:bg-orange-200", icon: RotateCcw, label: "RETOUR" };
            default:
                return { color: "bg-gray-100 text-gray-800", icon: Clock, label: s };
        }
    };

    const config = getStatusConfig(status);
    const Icon = config.icon;

    return (
        <Badge className={`${config.color} border-none gap-1 py-1`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </Badge>
    );
};

export default StatusBadge;
