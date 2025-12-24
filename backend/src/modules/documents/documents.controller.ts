import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('projects/:projectKey/docs')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all documents in project' })
  @ApiResponse({ status: 200, description: 'List of documents' })
  async findAll(@Param('projectKey') projectKey: string) {
    return this.documentsService.findAllByProject(projectKey);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new document' })
  @ApiResponse({ status: 201, description: 'Document created' })
  async create(
    @Param('projectKey') projectKey: string,
    @Body() createDto: CreateDocumentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.documentsService.create(projectKey, createDto, user.id);
  }

  @Get(':docId')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document details' })
  async findOne(
    @Param('projectKey') projectKey: string,
    @Param('docId') docId: string,
  ) {
    return this.documentsService.findById(projectKey, docId);
  }

  @Patch(':docId')
  @ApiOperation({ summary: 'Update document' })
  @ApiResponse({ status: 200, description: 'Document updated' })
  async update(
    @Param('projectKey') projectKey: string,
    @Param('docId') docId: string,
    @Body() updateDto: UpdateDocumentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.documentsService.update(projectKey, docId, updateDto, user.id);
  }

  @Delete(':docId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({ status: 204, description: 'Document deleted' })
  async delete(
    @Param('projectKey') projectKey: string,
    @Param('docId') docId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.documentsService.delete(projectKey, docId, user.id);
  }
}

