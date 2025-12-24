import { IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSecretDto {
  @ApiProperty({ example: 'NEW_API_KEY', required: false })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'Key must be uppercase with underscores',
  })
  key?: string;

  @ApiProperty({ example: 'new-secret-value', required: false })
  @IsString()
  @IsOptional()
  @MinLength(1)
  value?: string;
}

