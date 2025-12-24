import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { Secret } from './entities/secret.entity';
import { CreateSecretDto } from './dto/create-secret.dto';
import { UpdateSecretDto } from './dto/update-secret.dto';
import { ProjectsService } from '../projects/projects.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '../auth/entities/user.entity';

@Injectable()
export class SecretsService {
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    @InjectRepository(Secret)
    private readonly secretRepository: Repository<Secret>,
    private readonly projectsService: ProjectsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    // Get encryption key from config (32 bytes for AES-256)
    const keyString = this.configService.get<string>('security.encryptionKey') || '';
    this.encryptionKey = crypto.scryptSync(keyString, 'salt', 32);
  }

  async findAllByProject(projectKey: string, userRole: UserRole): Promise<Array<{ id: string; key: string; createdAt: Date; updatedAt: Date }>> {
    const project = await this.projectsService.findByKey(projectKey);
    const secrets = await this.secretRepository.find({
      where: { projectId: project.id },
      order: { key: 'ASC' },
    });

    // Return masked values
    return secrets.map(s => ({
      id: s.id,
      key: s.key,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async getDecryptedValue(projectKey: string, secretId: string, userRole: UserRole): Promise<string> {
    // Only admins can view decrypted values
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can view secret values');
    }

    const project = await this.projectsService.findByKey(projectKey);
    const secret = await this.secretRepository.findOne({
      where: { id: secretId, projectId: project.id },
    });

    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    return this.decrypt(secret.valueEncrypted);
  }

  async create(projectKey: string, createDto: CreateSecretDto, userId: string): Promise<Secret> {
    const project = await this.projectsService.findByKey(projectKey);

    // Check if key already exists
    const existing = await this.secretRepository.findOne({
      where: { projectId: project.id, key: createDto.key },
    });

    if (existing) {
      throw new ConflictException(`Secret with key '${createDto.key}' already exists`);
    }

    // Encrypt value
    const valueEncrypted = this.encrypt(createDto.value);

    const secret = this.secretRepository.create({
      projectId: project.id,
      key: createDto.key,
      valueEncrypted,
    });

    const saved = await this.secretRepository.save(secret);

    await this.auditService.log({
      actorUserId: userId,
      action: 'SECRET_CREATE',
      entityType: 'secret',
      entityId: saved.id,
      details: { projectKey, key: saved.key },
    });

    return saved;
  }

  async update(
    projectKey: string,
    secretId: string,
    updateDto: UpdateSecretDto,
    userId: string,
  ): Promise<Secret> {
    const project = await this.projectsService.findByKey(projectKey);
    const secret = await this.secretRepository.findOne({
      where: { id: secretId, projectId: project.id },
    });

    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    if (updateDto.key) {
      // Check if new key already exists
      const existing = await this.secretRepository.findOne({
        where: { projectId: project.id, key: updateDto.key },
      });
      if (existing && existing.id !== secretId) {
        throw new ConflictException(`Secret with key '${updateDto.key}' already exists`);
      }
      secret.key = updateDto.key;
    }

    if (updateDto.value) {
      secret.valueEncrypted = this.encrypt(updateDto.value);
    }

    const saved = await this.secretRepository.save(secret);

    await this.auditService.log({
      actorUserId: userId,
      action: 'SECRET_UPDATE',
      entityType: 'secret',
      entityId: saved.id,
      details: { projectKey, key: saved.key },
    });

    return saved;
  }

  async delete(projectKey: string, secretId: string, userId: string): Promise<void> {
    const project = await this.projectsService.findByKey(projectKey);
    const secret = await this.secretRepository.findOne({
      where: { id: secretId, projectId: project.id },
    });

    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    await this.auditService.log({
      actorUserId: userId,
      action: 'SECRET_DELETE',
      entityType: 'secret',
      entityId: secretId,
      details: { projectKey, key: secret.key },
    });

    await this.secretRepository.remove(secret);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return IV + AuthTag + Encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

