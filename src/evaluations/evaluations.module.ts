import { Module } from '@nestjs/common';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
// import { AuthGuard } from '@nestjs/passport';

@Module({
  imports:[],
  controllers: [EvaluationsController],
  providers: [EvaluationsService]
})
export class EvaluationsModule {}
