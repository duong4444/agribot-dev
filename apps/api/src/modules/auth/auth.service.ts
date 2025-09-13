import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { EmailService } from '../../common/services/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
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

    // Gán password mới - @BeforeUpdate hook sẽ tự động hash
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

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (!user) {
      // Không trả về lỗi để tránh email enumeration attack
      return { message: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu' };
    }

    // Tạo reset token
    const resetToken = this.jwtService.sign(
      { userId: user.id, email: user.email },
      { expiresIn: '1h' }
    );

    // Tạo reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      // Gửi email thực
      await this.emailService.sendPasswordResetEmail(
        user.email, 
        resetLink, 
        user.fullName
      );
      
      console.log(`Password reset email sent to ${user.email}`);
      console.log(`Reset link: ${resetLink}`);

      return { 
        message: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu'
      };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      
      // Nếu gửi email thất bại, vẫn trả về message thành công để bảo mật
      // Nhưng log lỗi để admin biết
      return { 
        message: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu',
        // Chỉ trong development mới hiển thị lỗi để debug
        ...(process.env.NODE_ENV === 'development' && { 
          debug: `Email sending failed: ${error.message}` 
        })
      };
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      // Verify reset token
      const payload = this.jwtService.verify(token);
      
      if (!payload.userId || !payload.email) {
        throw new Error('Token không hợp lệ');
      }

      // Tìm user
      const user = await this.userRepository.findOne({ 
        where: { id: payload.userId, email: payload.email } 
      });

      if (!user) {
        throw new Error('User không tồn tại');
      }

      // Cập nhật mật khẩu - @BeforeUpdate hook sẽ tự động hash
      user.password = newPassword;
      await this.userRepository.save(user);

      return { message: 'Mật khẩu đã được đặt lại thành công' };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token đã hết hạn. Vui lòng yêu cầu link đặt lại mật khẩu mới.');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Token không hợp lệ');
      }
      throw new Error('Đã xảy ra lỗi khi đặt lại mật khẩu');
    }
  }
}