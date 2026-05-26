import { getMasterAvatarUrl } from "@/lib/masterAvatar";

interface MasterAvatarProps {
  fullName: string;
  avatarUrl?: string | null;
  className?: string;
}

export function MasterAvatar({ fullName, avatarUrl, className }: MasterAvatarProps) {
  const src = getMasterAvatarUrl({ fullName, avatarUrl });

  if (!src) {
    return (
      <div
        className={`grid place-items-center font-display text-5xl text-ink-300 bg-cream-200 ${className ?? ""}`}
        aria-label={fullName}
      >
        {fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
      </div>
    );
  }

  return <img src={src} alt={fullName} className={className} />;
}
