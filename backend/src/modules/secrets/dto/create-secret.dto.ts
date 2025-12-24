import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSecretDto {
  @ApiProperty({ example: 'API_KEY' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'Key must be uppercase with underscores (e.g., API_KEY)',
  })
  key: string;

  @ApiProperty({ example: 'sk-1234567890abcdef' })
  @IsString()
  @MinLength(1)
  value: string;
}

