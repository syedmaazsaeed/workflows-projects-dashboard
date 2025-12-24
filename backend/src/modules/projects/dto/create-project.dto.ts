import { IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'My Automation Project' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ 
    example: 'my-automation-project',
    description: 'URL-friendly project key (lowercase, hyphens allowed)'
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Project key must be lowercase with hyphens only',
  })
  projectKey: string;

  @ApiProperty({ example: 'A project for managing my automation workflows', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

