import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from './services/email.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string; email: string }> {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiry = new Date();
    verificationCodeExpiry.setMinutes(verificationCodeExpiry.getMinutes() + 15); // 15 minutes expiry

    // Create user (not approved, email not verified)
    const user = this.userRepository.create({
      email,
      name,
      passwordHash,
      role: UserRole.VIEWER, // Default role
      emailVerified: false,
      isApproved: false,
      verificationCode,
      verificationCodeExpiry,
    });

    await this.userRepository.save(user);

    // Send verification code via email
    await this.emailService.sendVerificationCode(email, verificationCode, name);

    return {
      message: 'Registration successful. Please check your email for the verification code.',
      email,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email address before logging in. Check your email for the verification code.');
    }

    // Check if user is approved by admin
    if (!user.isApproved) {
      throw new UnauthorizedException('Your account is pending admin approval. You will be notified once approved.');
    }

    return this.generateAuthResponse(user);
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: payload.sub } });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.role = role;
    return this.userRepository.save(user);
  }

  async verifyEmail(email: string, code: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (!user.verificationCode || user.verificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (!user.verificationCodeExpiry || user.verificationCodeExpiry < new Date()) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    // Verify email
    user.emailVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiry = null;
    await this.userRepository.save(user);

    return { message: 'Email verified successfully. Your account is pending admin approval.' };
  }

  async resendVerificationCode(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiry = new Date();
    verificationCodeExpiry.setMinutes(verificationCodeExpiry.getMinutes() + 15);

    user.verificationCode = verificationCode;
    user.verificationCodeExpiry = verificationCodeExpiry;
    await this.userRepository.save(user);

    // Send verification code via email
    await this.emailService.sendVerificationCode(email, verificationCode, user.name);

    return { message: 'Verification code sent to your email' };
  }

  async approveUser(userId: string, approved: boolean): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isApproved = approved;
    await this.userRepository.save(user);

    // Send notification email
    await this.emailService.sendApprovalNotification(user.email, user.name, approved);

    return user;
  }

  async getPendingUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: [
        { emailVerified: true, isApproved: false },
        { emailVerified: false, isApproved: false },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async getApprovedUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { isApproved: true },
      order: { createdAt: 'DESC' },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.passwordHash = newPasswordHash;
    await this.userRepository.save(user);

    return { message: 'Password updated successfully' };
  }

  private generateAuthResponse(user: User): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}

