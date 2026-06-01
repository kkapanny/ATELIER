import { getMasterAvatarUrl } from "@/lib/masterAvatar";
import { classNames } from "@/lib/utils";

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
        className={classNames(
          "grid place-items-center font-display text-ink-300 bg-cream-200",
          className ?? "text-5xl",
        )}
        aria-label={fullName}
      >
        {fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
      </div>
    );
  }

  return <img src={src} alt={fullName} className={className} />;
}

const CIRCLE_SIZES = {
  sm: "w-10 h-10",
  md: "w-14 h-14",
  lg: "w-16 h-16",
} as const;

export function MasterAvatarCircle({
  fullName,
  avatarUrl,
  size = "md",
  className,
}: MasterAvatarProps & { size?: keyof typeof CIRCLE_SIZES; className?: string }) {
  return (
    <div
      className={classNames(
        CIRCLE_SIZES[size],
        "rounded-full overflow-hidden shrink-0 bg-cream-200",
        className,
      )}
    >
      <MasterAvatar
        fullName={fullName}
        avatarUrl={avatarUrl}
        className="w-full h-full object-cover object-top text-lg"
      />
    </div>
  );
}
