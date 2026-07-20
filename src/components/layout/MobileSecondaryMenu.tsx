import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import { NovoAssuntoWizard } from "@/components/dossies/NovoAssuntoWizard";
import { HelpAssistantPanel } from "@/components/help/HelpAssistantPanel";
import { QuickCreateMenu } from "@/components/layout/QuickCreateMenu";
import { GlobalSearchTrigger } from "@/components/search/GlobalSearchTrigger";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type MobileSecondaryMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const mobileMenuItemClassName =
  "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3.5 py-3 text-left text-[15px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25";

export function MobileSecondaryMenu({ open, onOpenChange }: MobileSecondaryMenuProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [newSubjectOpen, setNewSubjectOpen] = useState(false);

  function closeMenu() {
    onOpenChange(false);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          closeLabel="Fechar menu"
          className="flex h-[100dvh] w-[88vw] max-w-sm flex-col gap-0 overflow-hidden border-border/70 bg-background p-0 text-foreground"
        >
          <SheetHeader className="shrink-0 border-b border-border/60 px-5 py-5 pr-12 text-left">
            <SheetTitle className="flex items-center gap-2.5">
              <img src="/logo.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
              <span className="min-w-0">
                <span className="block font-display text-base font-semibold">Tribuno</span>
                <span className="block truncate text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                  Gabinete Digital do Eleito
                </span>
              </span>
            </SheetTitle>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
            <GlobalSearchTrigger variant="mobile" onOpen={closeMenu} />

            <QuickCreateMenu
              variant="mobile"
              onNewSubject={() => {
                closeMenu();
                setNewSubjectOpen(true);
              }}
              onSecondarySelect={closeMenu}
            />

            <Link to="/definicoes" onClick={closeMenu} className={mobileMenuItemClassName}>
              <Settings className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>Definições e perfil</span>
            </Link>

            <HelpAssistantPanel pathname={pathname} triggerClassName={mobileMenuItemClassName} />
          </div>

          <div
            className={cn(
              "shrink-0 border-t border-border/60 px-3 pt-3",
              "pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
            )}
          >
            <LogoutConfirmDialog
              trigger={
                <button type="button" className={mobileMenuItemClassName}>
                  <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>Terminar sessão</span>
                </button>
              }
              onFinished={closeMenu}
            />
          </div>
        </SheetContent>
      </Sheet>

      <NovoAssuntoWizard open={newSubjectOpen} onOpenChange={setNewSubjectOpen} hideTrigger />
    </>
  );
}
