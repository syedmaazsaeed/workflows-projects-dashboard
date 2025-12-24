import { IsString, MinLength, MaxLength, Matches, IsOptional, IsEnum, IsBoolean, IsUUID, ValidateNested, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { WebhookRoutingType, TransformRules } from '../entities/webhook.entity';

export class CreateWebhookDto {
  @ApiProperty({ 
    example: 'github-events',
    description: 'URL-friendly webhook key'
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Hook key must be lowercase with hyphens only',
  })
  hookKey: string;

  @ApiProperty({ example: 'Receives GitHub webhook events', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: WebhookRoutingType })
  @IsEnum(WebhookRoutingType)
  routingType: WebhookRoutingType;

  @ApiProperty({ example: 'https://api.example.com/webhook', required: false })
  @IsString()
  @IsOptional()
  targetUrl?: string;

  @ApiProperty({ example: 'https://n8n.example.com/webhook/abc123', required: false })
  @IsString()
  @IsOptional()
  n8nWebhookUrl?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  workflowId?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  transformRules?: TransformRules;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

