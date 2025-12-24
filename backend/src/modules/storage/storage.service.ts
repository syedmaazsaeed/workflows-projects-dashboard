import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LocalStorageProvider } from './providers/local.provider';
import { S3StorageProvider } from './providers/s3.provider';

export interface StorageProvider {
  store(path: string, content: string): Promise<void>;
  retrieve(path: string): Promise<string>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

@Injectable()
export class StorageService implements StorageProvider {
  private readonly provider: StorageProvider;
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly localProvider: LocalStorageProvider,
    private readonly s3Provider: S3StorageProvider,
  ) {
    const storageType = this.configService.get<string>('storage.type');
    
    if (storageType === 's3') {
      this.provider = this.s3Provider;
      this.logger.log('Using S3 storage provider');
    } else {
      this.provider = this.localProvider;
      this.logger.log('Using local storage provider');
    }
  }

  async store(path: string, content: string): Promise<void> {
    return this.provider.store(path, content);
  }

  async retrieve(path: string): Promise<string> {
    return this.provider.retrieve(path);
  }

  async delete(path: string): Promise<void> {
    return this.provider.delete(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.provider.exists(path);
  }
}

