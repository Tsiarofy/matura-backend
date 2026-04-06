import { Body, Controller, Post, UseGuards,Request} from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto, UpdateEvauationDto } from './evaluations.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SessionDto } from 'src/auth/dto/auth.dto';

@Controller('evaluations')
@UseGuards(JwtAuthGuard)
export class EvaluationsController {
    constructor(private evalService:EvaluationsService){}
    @Post()
    async registerEvaluation(@Body() evaluation:CreateEvaluationDto,@Request() userRequest:{user:{payload:SessionDto}}){
          try {
           const result=await this.evalService.createEvaluation(evaluation,userRequest.user.payload.id)
           return result;  
        } catch (error) {
            console.error(error)
            return error;
          }
    }

    @Post()
    async updateEvaluation(@Body() evaluation:UpdateEvauationDto,@Request() userRequest:{user:{payload:SessionDto}}){
        try {
            const result=await this.evalService.updateEvaluation(evaluation,userRequest.user.payload.id)
            return result
        } catch (error) {
          console.error(error)
          return error;
        }
    }
}
