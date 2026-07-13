import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { logout } from "@/lib/auth-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function LogoutConfirmDialog({
  trigger,
  onFinished,
}: {
  trigger: ReactNode;
  onFinished?: () => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [aTerminar, setATerminar] = useState(false);

  async function confirmar() {
    if (aTerminar) return;
    setATerminar(true);
    try {
      await logout();
      onFinished?.();
      await navigate({ to: "/login", replace: true });
    } finally {
      setATerminar(false);
      setOpen(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(value) => !aTerminar && setOpen(value)}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Terminar sessão?</AlertDialogTitle>
          <AlertDialogDescription>
            Vais sair desta conta. Os teus dados continuam guardados no Tribuno.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={aTerminar}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={aTerminar}
            onClick={(event) => {
              event.preventDefault();
              void confirmar();
            }}
            className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          >
            {aTerminar ? "A terminar sessão…" : "Terminar sessão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
