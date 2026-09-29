import { IsIn, IsOptional, IsString } from 'class-validator';
import { CAPTACAO_MANAGER_DECISIONS } from '../captacao.constants';

export class ManagerDecisionDto {
  @IsIn([...CAPTACAO_MANAGER_DECISIONS].filter((d) => d !== 'pendente'))
  decision!: 'aprovado' | 'reprovado' | 'ajuste';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  presentationDate?: string;
}
