import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

const auditActions = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE'] as const;
const auditEntities = ['transaction', 'user'] as const;

export class AuditLogQueryDto {
  @ApiPropertyOptional({ enum: auditActions })
  @IsOptional()
  @IsEnum(auditActions)
  action?: (typeof auditActions)[number];

  @ApiPropertyOptional({ enum: auditEntities })
  @IsOptional()
  @IsEnum(auditEntities)
  entity?: (typeof auditEntities)[number];

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;
}
