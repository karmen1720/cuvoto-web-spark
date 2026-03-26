import { ChevronDown } from "lucide-react";
import type { Tank } from "@/hooks/useTanks";

interface TankSelectorProps {
  tanks: Tank[];
  selectedTankId: string | null;
  onSelect: (tankId: string) => void;
}

const TankSelector = ({ tanks, selectedTankId, onSelect }: TankSelectorProps) => {
  if (tanks.length <= 1) return null;

  return (
    <div className="relative">
      <select
        value={selectedTankId || ""}
        onChange={(e) => onSelect(e.target.value)}
        className="appearance-none w-full px-3 py-2 pr-8 bg-cuvoto-dark-card border border-cuvoto-border-dark rounded-xl text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {tanks.map((tank) => (
          <option key={tank.id} value={tank.id}>
            {tank.name} {tank.device_id ? `(${tank.device_id})` : ""}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    </div>
  );
};

export default TankSelector;
