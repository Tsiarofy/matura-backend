import { IsEnum } from 'class-validator';
import { StatutCandidature } from '@matura/shared';

// BUG FIX : ancienne version utilisait z.string() provisoire
// (commentaire dans metier.schema.ts : "Temporaire pour éviter erreur")
// Maintenant que StatutCandidature est défini dans financement.schema.ts, on l'utilise.

export class ChangerStatutDto {
  @IsEnum(StatutCandidature)
  statut: StatutCandidature;
}
