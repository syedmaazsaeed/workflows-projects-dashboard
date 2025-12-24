import { IsString, MinLength, MaxLength, Matches, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkflowStatus } from '../entities/workflow.entity';

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Email Automation Workflow' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ 
    example: 'email-automation',
    description: 'URL-friendly workflow key'
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Workflow key must be lowercase with hyphens only',
  })
  workflowKey: string;

  @ApiProperty({ example: ['email', 'automation'], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ enum: WorkflowStatus, required: false })
  @IsEnum(WorkflowStatus)
  @IsOptional()
  status?: WorkflowStatus;

  @ApiProperty({ example: 'n8n-workflow-123', required: false })
  @IsString()
  @IsOptional()
  n8nWorkflowId?: string;
}

