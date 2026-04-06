import { HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEvaluationDto, UpdateEvauationDto } from './evaluations.dto';



@Injectable()
export class EvaluationsService {
    constructor(private prisma:PrismaService){}

    async createEvaluation(evaluation:CreateEvaluationDto,projetId:number){
     try {
        const result=await this.prisma.evaluation.create({
            data:{projetId:projetId,...evaluation}
        })
        return result;
     } catch (error) {
        console.error(error)
        throw new InternalServerErrorException("Erreur lors de l'enregistrement de l'evaluation")
     }
    }

    async updateEvaluation(evaluation:UpdateEvauationDto,evaluationId:number){
    try {
        const result=await this.prisma.evaluation.update({
            where:{id:evaluationId},
            data:evaluation
        })
        return result;
    } catch (error) {
        console.error(error)
        throw new InternalServerErrorException("Erreur lors de la mise à jour de l'évaluation")
    }
    }

    
}
