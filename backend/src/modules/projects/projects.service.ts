import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '../auth/entities/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(userId: string, userRole: UserRole): Promise<Project[]> {
    // Admins can see all projects
    if (userRole === UserRole.ADMIN) {
      return this.projectRepository.find({
        relations: ['createdBy'],
        order: { createdAt: 'DESC' },
      });
    }

    // Other users see projects they created or are members of
    const ownProjects = await this.projectRepository.find({
      where: { createdById: userId },
      relations: ['createdBy'],
    });

    const memberships = await this.memberRepository.find({
      where: { userId },
      relations: ['project', 'project.createdBy'],
    });

    const memberProjects = memberships.map(m => m.project);
    
    // Combine and deduplicate
    const allProjects = [...ownProjects];
    for (const project of memberProjects) {
      if (!allProjects.find(p => p.id === project.id)) {
        allProjects.push(project);
      }
    }

    return allProjects.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findByKey(projectKey: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { projectKey },
      relations: ['createdBy'],
    });

    if (!project) {
      throw new NotFoundException(`Project with key '${projectKey}' not found`);
    }

    return project;
  }

  async findById(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!project) {
      throw new NotFoundException(`Project not found`);
    }

    return project;
  }

  async create(createDto: CreateProjectDto, userId: string): Promise<Project> {
    // Check if project key already exists
    const existing = await this.projectRepository.findOne({
      where: { projectKey: createDto.projectKey },
    });

    if (existing) {
      throw new ConflictException(`Project key '${createDto.projectKey}' already exists`);
    }

    const project = this.projectRepository.create({
      ...createDto,
      createdById: userId,
    });

    const saved = await this.projectRepository.save(project);

    // Add creator as ADMIN member
    await this.memberRepository.save({
      projectId: saved.id,
      userId,
      role: UserRole.ADMIN,
    });

    await this.auditService.log({
      actorUserId: userId,
      action: 'PROJECT_CREATE',
      entityType: 'project',
      entityId: saved.id,
      details: { projectKey: saved.projectKey, name: saved.name },
    });

    return saved;
  }

  async update(projectKey: string, updateDto: UpdateProjectDto, userId: string): Promise<Project> {
    const project = await this.findByKey(projectKey);

    // Check if user can update
    await this.checkProjectAccess(project.id, userId, [UserRole.ADMIN, UserRole.DEVELOPER]);

    Object.assign(project, updateDto);
    const saved = await this.projectRepository.save(project);

    await this.auditService.log({
      actorUserId: userId,
      action: 'PROJECT_UPDATE',
      entityType: 'project',
      entityId: saved.id,
      details: { changes: updateDto },
    });

    return saved;
  }

  async delete(projectKey: string, userId: string, userRole: UserRole): Promise<void> {
    const project = await this.findByKey(projectKey);

    // Only system admins can delete projects
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete projects');
    }

    await this.auditService.log({
      actorUserId: userId,
      action: 'PROJECT_DELETE',
      entityType: 'project',
      entityId: project.id,
      details: { projectKey: project.projectKey, name: project.name },
    });

    await this.projectRepository.remove(project);
  }

  async getMembers(projectKey: string): Promise<ProjectMember[]> {
    const project = await this.findByKey(projectKey);
    return this.memberRepository.find({
      where: { projectId: project.id },
      relations: ['user'],
    });
  }

  async addMember(projectKey: string, addMemberDto: AddMemberDto, actorUserId: string): Promise<ProjectMember> {
    const project = await this.findByKey(projectKey);

    // Check if actor has permission
    await this.checkProjectAccess(project.id, actorUserId, [UserRole.ADMIN]);

    // Check if member already exists
    const existing = await this.memberRepository.findOne({
      where: { projectId: project.id, userId: addMemberDto.userId },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }

    const member = this.memberRepository.create({
      projectId: project.id,
      userId: addMemberDto.userId,
      role: addMemberDto.role,
    });

    const saved = await this.memberRepository.save(member);

    await this.auditService.log({
      actorUserId,
      action: 'PROJECT_MEMBER_ADD',
      entityType: 'project_member',
      entityId: saved.id,
      details: { projectKey, userId: addMemberDto.userId, role: addMemberDto.role },
    });

    return saved;
  }

  async removeMember(projectKey: string, userId: string, actorUserId: string): Promise<void> {
    const project = await this.findByKey(projectKey);

    // Check if actor has permission
    await this.checkProjectAccess(project.id, actorUserId, [UserRole.ADMIN]);

    const member = await this.memberRepository.findOne({
      where: { projectId: project.id, userId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in project');
    }

    await this.auditService.log({
      actorUserId,
      action: 'PROJECT_MEMBER_REMOVE',
      entityType: 'project_member',
      entityId: member.id,
      details: { projectKey, userId },
    });

    await this.memberRepository.remove(member);
  }

  async checkProjectAccess(
    projectId: string,
    userId: string,
    requiredRoles: UserRole[],
  ): Promise<ProjectMember | null> {
    const member = await this.memberRepository.findOne({
      where: { projectId, userId },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this project');
    }

    if (!requiredRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    return member;
  }

  async hasProjectAccess(projectId: string, userId: string, userRole: UserRole): Promise<boolean> {
    // System admins have access to all projects
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    const member = await this.memberRepository.findOne({
      where: { projectId, userId },
    });

    return !!member;
  }
}

