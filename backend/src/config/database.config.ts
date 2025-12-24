import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const databaseUrl = this.configService.get<string>('database.url');

    const isDevelopment = this.configService.get('nodeEnv') === 'development';
    
    if (databaseUrl) {
      return {
        type: 'postgres',
        url: databaseUrl,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: isDevelopment, // Auto-sync in development
        logging: isDevelopment,
        ssl: this.configService.get('nodeEnv') === 'production' 
          ? { rejectUnauthorized: false } 
          : false,
      };
    }

    return {
      type: 'postgres',
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
      username: this.configService.get<string>('database.username'),
      password: this.configService.get<string>('database.password'),
      database: this.configService.get<string>('database.database'),
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: isDevelopment, // Auto-sync in development
      logging: isDevelopment,
    };
  }
}

