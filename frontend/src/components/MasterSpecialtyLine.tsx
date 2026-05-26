import { formatMasterSpecialtyLine } from "@/lib/masterSpecialties";

interface MasterSpecialtyLineProps {
  services?: { name: string }[];
  specialties?: string[] | null;
  experienceYears: number;
  className?: string;
}

export function MasterSpecialtyLine({
  services,
  specialties,
  experienceYears,
  className = "text-xs tracking-widest uppercase text-ink-300",
}: MasterSpecialtyLineProps) {
  return (
    <div className={className}>
      {formatMasterSpecialtyLine(services, experienceYears, specialties)}
    </div>
  );
}
