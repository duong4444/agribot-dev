import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  // check thằng req đến có role == ADMIN không
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Kiểm tra user đã đăng nhập
    if (!user) {
      throw new UnauthorizedException('Cần đăng nhập để truy cập tài nguyên này');
    }

    // Kiểm tra user có role ADMIN
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Chỉ quản trị viên mới có quyền truy cập tài nguyên này');
    }

    return true;
  }
}

