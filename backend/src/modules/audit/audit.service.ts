import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLog } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(data: CreateAuditLogDto): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      actorUserId: data.actorUserId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || null,
      details: data.details || {},
    });

    return this.auditLogRepository.save(log);
  }

  async findByProject(
    projectId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actorUser', 'user')
      .where(
        `(log.details->>'projectKey' IS NOT NULL OR 
          (log.entityType IN ('project', 'workflow', 'webhook', 'document', 'secret') 
           AND log.entityId IS NOT NULL))`,
      )
      .orderBy('log.createdAt', 'DESC');

    const total = await queryBuilder.getCount();

    queryBuilder
      .limit(options.limit || 50)
      .offset(options.offset || 0);

    const logs = await queryBuilder.getMany();

    return { logs, total };
  }

  async findRecent(limit: number = 10): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      relations: ['actorUser'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      relations: ['actorUser'],
      order: { createdAt: 'DESC' },
    });
  }
}

