import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  // ktra user có đúng role không
  //   Reflector là gì?

  // Reflector là NestJS utility để đọc metadata từ decorators
  // Metadata = thông tin gắn vào class/method thông qua decorators
  // Dùng để lấy requiredRoles từ @Roles() decorator
  canActivate(context: ExecutionContext): boolean {
    //ExecutionContext là gì?
    // Chứa thông tin về request hiện tại
    // Cho phép access vào: controller, handler, request object...
    // return true = allow , false = forbidden
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()], // method decorator - class decorator
    );

    //     getAllAndOverride() - Đọc metadata với strategy override:
    // Đọc từ method trước (handler)
    // Nếu không có → đọc từ class
    // Method decorator override class decorator

    if (!requiredRoles) {
      return true;
    }
    // Chuyển context sang HTTP mode , getRequest() - Lấy request object , req.user (từ guard/strategy)
    const { user } = context.switchToHttp().getRequest();
    // NÓI CHUNG LÀ ĐỌC METADATA CHECK ACTOR NÀO (REQ.USER) CHỨA ROLE ĐƯỢC PHÉP
    return requiredRoles.some((role) => user.role?.includes(role));
  }
}
