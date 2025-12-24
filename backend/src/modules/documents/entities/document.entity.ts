import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../auth/entities/user.entity';

export enum DocType {
  README = 'README',
  SPEC = 'SPEC',
  NOTES = 'NOTES',
  INTEGRATION = 'INTEGRATION',
  OTHER = 'OTHER',
}

@Entity('documents')
export class Document extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({
    name: 'doc_type',
    type: 'enum',
    enum: DocType,
    default: DocType.NOTES,
  })
  docType: DocType;

  @Column({ type: 'text' })
  title: string;

  @Column({ name: 'content_md', type: 'text', default: '' })
  contentMd: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}

