import { IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator'

const DECISIONS_MISSION = ['VALIDEE', 'REJETEE'] as const

export class EvaluerMissionDto {
  @IsIn(DECISIONS_MISSION)
  decision: (typeof DECISIONS_MISSION)[number]

  @IsOptional()
  @ValidateIf((o: EvaluerMissionDto) => o.decision === 'REJETEE')
  @IsString()
  @MinLength(1)
  motif_rejet?: string
}
