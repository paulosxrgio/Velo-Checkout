import type { CSSProperties, ReactNode } from "react";
import { isHexColor, readableForeground } from "@/domain/color";
import { cn } from "@/lib/cn";

/** Aplica a cor da marca como variáveis CSS para os componentes do checkout. */
export function BrandTheme({ color, children, className }: { color: string; children: ReactNode; className?: string }) {
  const brand = isHexColor(color) ? color : "#1f4d3a";
  const style = { "--brand": brand, "--brand-fg": readableForeground(brand) } as CSSProperties;
  return (
    <div style={style} className={cn(className)}>
      {children}
    </div>
  );
}
