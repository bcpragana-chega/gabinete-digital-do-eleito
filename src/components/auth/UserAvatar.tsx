import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { iniciais, nomeVisivel, type AuthUser, type PerfilEleito } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export function UserAvatar({
  user,
  perfil,
  className,
}: {
  user?: AuthUser;
  perfil?: PerfilEleito;
  className?: string;
}) {
  const nome = nomeVisivel(user, perfil);

  return (
    <Avatar className={cn("h-9 w-9 border border-border/70", className)}>
      {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={nome} />}
      <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
        {iniciais(nome)}
      </AvatarFallback>
    </Avatar>
  );
}
