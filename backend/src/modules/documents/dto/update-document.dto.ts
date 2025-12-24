import { IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocType } from '../entities/document.entity';

export class UpdateDocumentDto {
  @ApiProperty({ example: 'Updated Title', required: false })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiProperty({ enum: DocType, required: false })
  @IsEnum(DocType)
  @IsOptional()
  docType?: DocType;

  @ApiProperty({ example: '# Updated Content\n\nNew content here...', required: false })
  @IsString()
  @IsOptional()
  contentMd?: string;
}

