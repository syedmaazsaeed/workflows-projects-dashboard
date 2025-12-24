import { IsString, MinLength, MaxLength, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkflowStatus } from '../entities/workflow.entity';

export class UpdateWorkflowDto {
  @ApiProperty({ example: 'Updated Workflow Name', required: false })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiProperty({ example: ['email', 'automation', 'new-tag'], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ enum: WorkflowStatus, required: false })
  @IsEnum(WorkflowStatus)
  @IsOptional()
  status?: WorkflowStatus;

  @ApiProperty({ example: 'n8n-workflow-456', required: false })
  @IsString()
  @IsOptional()
  n8nWorkflowId?: string;
}

