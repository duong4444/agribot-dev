import { Controller, Post, Body, Get, UseGuards, Request, Put, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body() loginDto: LoginDto) {
    return {
      success: true,
      data: await this.authService.login(req.user),
      message: 'Đăng nhập thành công',
    };
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    return {
      success: true,
      data: user,
      message: 'Đăng ký thành công',
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(forgotPasswordDto.email);
    return {
      success: true,
      message: result.message,
      ...(result.debug && { debug: result.debug }),
    };
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      const result = await this.authService.resetPassword(
        resetPasswordDto.token,
        resetPasswordDto.newPassword
      );
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return {
      success: true,
      data: req.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const user = await this.authService.updateProfile(req.user.id, updateProfileDto);
    return {
      success: true,
      data: user,
      message: 'Cập nhật thông tin thành công',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    await this.authService.changePassword(
      req.user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
    return {
      success: true,
      message: 'Đổi mật khẩu thành công',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refreshToken(@Request() req) {
    const tokens = await this.authService.refreshToken(req.user.id);
    return {
      success: true,
      data: tokens,
    };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req) {
    // Guard sẽ redirect đến Google OAuth
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const result = await this.authService.googleLogin(req.user);
    
    // Redirect về frontend với token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const redirectUrl = `${frontendUrl}/callback?token=${result.accessToken}&refresh=${result.refreshToken}`;
    
    res.redirect(redirectUrl);
  }
}