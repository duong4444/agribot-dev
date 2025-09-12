import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { User } from '../users/entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { getJwtConfig } from '../../common/config/jwt.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // import User entity để AuthService có thể inject UserRepository
    PassportModule, // module để xử lý authentication
    JwtModule.registerAsync({  // cấu hình jwt token
      imports: [ConfigModule], // nhận config từ config module
      useFactory: getJwtConfig, // hàm để tạo config jwt (secret và expiresIn)
      inject: [ConfigService], // nhận config từ config service
    }),
    UsersModule, // import để sử dụng UsersService, để có thể inject UsersService vào JwtStrategy
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy], // 
  exports: [AuthService], // export để module khác có thể sử dụng AuthService
})
export class AuthModule {}
