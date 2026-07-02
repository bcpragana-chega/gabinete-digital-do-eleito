import type { ComponentPropsWithoutRef } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IconButtonProps = Omit<ComponentPropsWithoutRef<typeof Button>, "children"> & {
  icon: LucideIcon;
  label: string;
};

export function IconButton({ icon: Icon, label, className, ...props }: IconButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={label}
      title={label}
      className={cn("shrink-0", className)}
      {...props}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </Button>
  );
}
