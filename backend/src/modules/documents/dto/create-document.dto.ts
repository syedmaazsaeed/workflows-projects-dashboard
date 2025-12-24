import { IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocType } from '../entities/document.entity';

export class CreateDocumentDto {
  @ApiProperty({ example: 'API Integration Guide' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiProperty({ enum: DocType, default: DocType.NOTES })
  @IsEnum(DocType)
  @IsOptional()
  docType?: DocType;

  @ApiProperty({ example: '# API Integration Guide\n\nThis guide explains...', required: false })
  @IsString()
  @IsOptional()
  contentMd?: string;
}

