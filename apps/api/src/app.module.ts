import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './common/config/database.config';
import { getJwtConfig } from './common/config/jwt.config';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ChatModule } from './modules/chat/chat.module';
import { FarmsModule } from './modules/farms/farms.module';
import { AIRefactoredModule } from './modules/ai/ai-refactored.module';
import { IoTModule } from './modules/iot/iot.module';
import { WeatherModule } from './modules/weather/weather.module';
// import { KnowledgeModule } from './modules/knowledge/knowledge.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    
    // Cache
    // CacheModule.register({
    //   isGlobal: true,
    //   ttl: 300, // 5 minutes
    // }),
    
    // JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getJwtConfig,
      inject: [ConfigService],
    }),

    // Feature Modules
    AuthModule,
    UsersModule,
    ChatModule,
    FarmsModule,
    AIRefactoredModule,
    IoTModule,
    WeatherModule,
    // KnowledgeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
