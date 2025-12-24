import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'How does the email automation workflow work?' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  message: string;
}

