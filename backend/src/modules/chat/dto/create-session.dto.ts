import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: 'Workflow Questions', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;
}

