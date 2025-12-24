import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Document, DocType } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ProjectsService } from '../projects/projects.service';
import { VectorService } from '../vector/vector.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly projectsService: ProjectsService,
    private readonly vectorService: VectorService,
    private readonly auditService: AuditService,
  ) {}

  async findAllByProject(projectKey: string): Promise<Document[]> {
    const project = await this.projectsService.findByKey(projectKey);
    return this.documentRepository.find({
      where: { projectId: project.id },
      relations: ['createdBy'],
      order: { updatedAt: 'DESC' },
    });
  }

  async findById(projectKey: string, docId: string): Promise<Document> {
    const project = await this.projectsService.findByKey(projectKey);
    const document = await this.documentRepository.findOne({
      where: { id: docId, projectId: project.id },
      relations: ['createdBy'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async create(projectKey: string, createDto: CreateDocumentDto, userId: string): Promise<Document> {
    const project = await this.projectsService.findByKey(projectKey);

    const document = this.documentRepository.create({
      ...createDto,
      projectId: project.id,
      createdById: userId,
    });

    const saved = await this.documentRepository.save(document);

    // Index for vector search
    await this.vectorService.indexDocument(project.id, saved.id, saved.title, saved.contentMd);

    await this.auditService.log({
      actorUserId: userId,
      action: 'DOCUMENT_CREATE',
      entityType: 'document',
      entityId: saved.id,
      details: { projectKey, title: saved.title },
    });

    return saved;
  }

  async update(
    projectKey: string,
    docId: string,
    updateDto: UpdateDocumentDto,
    userId: string,
  ): Promise<Document> {
    const document = await this.findById(projectKey, docId);

    Object.assign(document, updateDto);
    const saved = await this.documentRepository.save(document);

    // Re-index for vector search
    const project = await this.projectsService.findByKey(projectKey);
    await this.vectorService.indexDocument(project.id, saved.id, saved.title, saved.contentMd);

    await this.auditService.log({
      actorUserId: userId,
      action: 'DOCUMENT_UPDATE',
      entityType: 'document',
      entityId: saved.id,
      details: { projectKey, changes: updateDto },
    });

    return saved;
  }

  async delete(projectKey: string, docId: string, userId: string): Promise<void> {
    const document = await this.findById(projectKey, docId);

    // Remove from vector index
    const project = await this.projectsService.findByKey(projectKey);
    await this.vectorService.deleteBySource(project.id, 'DOCUMENT', docId);

    await this.auditService.log({
      actorUserId: userId,
      action: 'DOCUMENT_DELETE',
      entityType: 'document',
      entityId: docId,
      details: { projectKey, title: document.title },
    });

    await this.documentRepository.remove(document);
  }
}

