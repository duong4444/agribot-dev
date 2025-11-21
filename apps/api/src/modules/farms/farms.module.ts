import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FarmsService } from './farms.service';
import { FarmsController } from './farms.controller';
import { Farm } from './entities/farm.entity';
import { Area } from './entities/area.entity';
import { Crop } from './entities/crop.entity';
import { FarmActivity } from './entities/farm-activity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Farm, Area, Crop, FarmActivity])],
  controllers: [FarmsController],
  providers: [FarmsService],
  exports: [FarmsService],
})
export class FarmsModule {}
