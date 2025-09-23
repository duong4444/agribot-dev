import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FarmService } from './farm.service';
import { FarmController } from './farm.controller';
import { Farm, Crop, Activity, Expense } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Farm, Crop, Activity, Expense]),
  ],
  controllers: [FarmController],
  providers: [FarmService],
  exports: [FarmService],
})
export class FarmModule {}
