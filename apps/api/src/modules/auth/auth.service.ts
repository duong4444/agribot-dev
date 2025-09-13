import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user && await user.validatePassword(password)) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
      },
    };
  }

  async register(registerData: {
    fullName: string;
    email: string;
    password: string;
    phoneNumber?: string;
  }) {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerData.email },
    });

    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Create new user
    const user = this.userRepository.create({
      fullName: registerData.fullName,
      email: registerData.email,
      password: registerData.password,
      phoneNumber: registerData.phoneNumber,
      role: UserRole.FARMER,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);
    const { password: _, ...result } = savedUser;

    return result;
  }

  async refreshToken(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
    };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isOldPasswordValid = await user.validatePassword(oldPassword);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Mật khẩu cũ không đúng');
    }

    user.password = newPassword;
    await this.userRepository.save(user);

    return { message: 'Mật khẩu đã được thay đổi thành công' };
  }

  async updateProfile(userId: string, updateData: {
    fullName?: string;
    phoneNumber?: string;
  }) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (updateData.fullName) user.fullName = updateData.fullName;
    if (updateData.phoneNumber) user.phoneNumber = updateData.phoneNumber;

    const updatedUser = await this.userRepository.save(user);
    const { password: _, ...result } = updatedUser;

    return result;
  }

  async validateGoogleUser(googleUser: any) {
    const { googleId, email, fullName, avatar } = googleUser;
    
    // Tìm user theo Google ID hoặc email
    let user = await this.userRepository.findOne({
      where: [
        { googleId },
        { email }
      ]
    });

    if (user) {
      // Cập nhật thông tin nếu user đã tồn tại
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (!user.avatar) {
        user.avatar = avatar;
      }
      user = await this.userRepository.save(user);
    } else {
      // Tạo user mới
      user = this.userRepository.create({
        googleId,
        email,
        fullName,
        avatar,
        role: UserRole.FARMER,
        isActive: true,
      });
      user = await this.userRepository.save(user);
    }

    const { password: _, ...result } = user;
    return result;
  }

  async googleLogin(googleUser: any) {
    const user = await this.validateGoogleUser(googleUser);
    return this.login(user);
  }
}