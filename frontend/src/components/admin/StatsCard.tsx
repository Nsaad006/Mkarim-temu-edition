import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendUp?: boolean;
    description?: string;
    className?: string;
    iconClassName?: string;
    iconBgClassName?: string;
}

const StatsCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendUp,
    description,
    className,
    iconClassName,
    iconBgClassName
}: StatsCardProps) => {
    return (
        <Card className={className}>
            <CardContent className="p-5">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBgClassName || "bg-primary/10"}`}>
                        <Icon className={`w-4 h-4 ${iconClassName || "text-primary"}`} />
                    </div>
                </div>
                <div className="flex flex-col mt-2">
                    <span className="text-2xl font-bold">{value}</span>
                    {description && (
                        <p className="text-[10px] text-muted-foreground mt-1">{description}</p>
                    )}
                    {trend && (
                        <p className={`text-[10px] font-medium mt-1 flex items-center ${trendUp ? "text-success" : "text-destructive"}`}>
                            {trendUp ? "↑" : "↓"} {trend}
                            <span className="text-muted-foreground ml-1">vs mois dernier</span>
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default StatsCard;
