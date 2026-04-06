import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProjetDto, UpdateDto } from './projet.dto';
import { AuthDto, SessionDto } from 'src/auth/dto/auth.dto';
import { error } from 'console';

@Injectable()
export class ProjetService {
    constructor(private  prisma:PrismaService){}
    
    async getAllProjet(){
      try {
        return this.prisma.projet.findMany()
      } catch (error) {
        throw new Error("Erreur lors de la recuperation des projets")
      }
    }
   
   async getProjectByuser(userId:number){
         try {
             const projects=await this.prisma.projet.findMany({
              where:{
                utilisateurId:userId
              }
             })
             if(projects.length!=0){
               return projects 
             }else{
              return [];
             }
         } catch (error) {
             throw new Error("Une erreur est survenus lors de la recuperations de vos projets");
         }
   }

    async addProject(dto:ProjetDto,userId:number) {
          // console.log("DANS LE SERVICE POUR CREER LE PROJET")
          try {
          // console.log("DANS LE TRY SERVICE POUR CREER LE PROJET")
          console.log("- - - userId - - -")
          console.log(userId)
            const createdProject=await this.prisma.projet.create({
                data:{...dto,utilisateurId:userId}
            })
            console.log(createdProject)
            return true
          } catch (error) {
          console.log(error)
            return new Error("Une erreur est survenu lors de l'enregistrement du projet")
          }
    }
    
    async updateProjet(id:number,dto:UpdateDto){
      try {
        const projet=await this.prisma.projet.findUnique({
          where:{id:id}
        })
        if(!projet){
          throw new Error("Projet introuvable");
        }
        await this.prisma.projet.update({
          where:{id:id},
          data:dto
        })
        return true;
      } catch (error) {
        console.error(error)
        throw new Error("Une erreur est survenu lors de la modification du projet")
      }
    }

    async deleteProjet(id:number,userId:number){
      try {
        const projet=await this.prisma.projet.findUnique({
          where:{id:id}
        })

        if(!projet){
          throw new Error("Projet introuvable");
        }
        else if(projet.utilisateurId!==userId){
          throw new error("Ne peux pas effacer un ptojet qui ne vous appartient pas")
        }
        await this.prisma.projet.delete({
          where:{id:id}
        })
        return `Projet avec l'id ${id} effacé avec succès`;
      } catch (error) {
        throw new NotFoundException("Une erreur est survenu lors de la suppression du projet")
      }
    }
}
