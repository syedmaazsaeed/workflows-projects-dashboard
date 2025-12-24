import { IsString, MaxLength, IsOptional, IsEnum, IsBoolean, IsUUID, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WebhookRoutingType, TransformRules } from '../entities/webhook.entity';

export class UpdateWebhookDto {
  @ApiProperty({ example: 'Updated description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: WebhookRoutingType, required: false })
  @IsEnum(WebhookRoutingType)
  @IsOptional()
  routingType?: WebhookRoutingType;

  @ApiProperty({ example: 'https://api.example.com/new-webhook', required: false })
  @IsString()
  @IsOptional()
  targetUrl?: string;

  @ApiProperty({ required: false })
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

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

