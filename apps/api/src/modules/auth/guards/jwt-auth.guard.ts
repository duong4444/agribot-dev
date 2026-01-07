import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    //override , trả về payload chứa message và cờ để FE nhận biết
  handleRequest(err: any, user: any, info: any) {
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException({
        message: 'Token đã hết hạn',
        isTokenExpired: true,
      });
    }
    
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    
    return user;
  }
}
