import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

import { StorageProvider } from '../storage.service';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client | null = null;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const s3Config = this.configService.get('storage.s3');
    this.bucket = s3Config?.bucket || '';

    if (s3Config?.accessKey && s3Config?.secretKey) {
      const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
        region: s3Config.region || 'us-east-1',
        credentials: {
          accessKeyId: s3Config.accessKey,
          secretAccessKey: s3Config.secretKey,
        },
      };

      if (s3Config.endpoint) {
        clientConfig.endpoint = s3Config.endpoint;
        clientConfig.forcePathStyle = true; // Required for S3-compatible storage
      }

      this.client = new S3Client(clientConfig);
    }
  }

  private getClient(): S3Client {
    if (!this.client) {
      throw new Error('S3 client not configured. Check S3 credentials in environment.');
    }
    return this.client;
  }

  async store(path: string, content: string): Promise<void> {
    const client = this.getClient();

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: path,
        Body: content,
        ContentType: 'application/json',
      }),
    );
  }

  async retrieve(path: string): Promise<string> {
    const client = this.getClient();

    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: path,
        }),
      );

      if (!response.Body) {
        throw new NotFoundException(`File not found: ${path}`);
      }

      return await response.Body.transformToString('utf-8');
    } catch (error) {
      if ((error as { name: string }).name === 'NoSuchKey') {
        throw new NotFoundException(`File not found: ${path}`);
      }
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    const client = this.getClient();

    await client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: path,
      }),
    );
  }

  async exists(path: string): Promise<boolean> {
    const client = this.getClient();

    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: path,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}

