import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post,Request, UseGuards} from '@nestjs/common';
import { ProjetService } from './projet.service';
import { ProjetDto,UpdateDto } from './projet.dto';
// import { ParseCreateProjetPipe, ParseUpdateProjetPipe } from './data.pipe';
import { SessionDto } from 'src/auth/dto/auth.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { retry } from 'rxjs';

@Controller('projet')
export class ProjetController {
    constructor(private service:ProjetService){}
    

    @UseGuards(JwtAuthGuard)
    @Post("/create")
    async addProjet(@Body() dto:ProjetDto,@Request() userRequest:{user:{payload:SessionDto}}){
        try {
            const {user}=userRequest;
            const {payload}=user;
            return await this.service.addProject(dto,payload.id);
        } catch (error) {
           throw error; 
        }
    }

   @Patch("/:id")
   async updateProjet(@Param("id",ParseIntPipe) id:number,@Body() dto:UpdateDto){
    try {
        return await this.service.updateProjet(id,dto)
    } catch (error) {
       throw error; 
    }
   }
   
   @Get("/all")
   async getAllProjet(@Request() userRequest:{user:{payload:SessionDto}}){
       try {

          return await this.service.getAllProjet();
       } catch (error) {
         throw error;
       }
   }

   @Get("/:userId/all")
   async getAllProjectByUser(@Param("userId",ParseIntPipe)userId:number) { 
   try {
      const userproject=await this.service.getProjectByuser(userId)
      return userproject;
   } catch (error) {
     console.error(error)
     throw error;
   }
   }
   
   @UseGuards(JwtAuthGuard)
   @Delete("/:id")
   async deleteProjet(@Param("id",ParseIntPipe) id:number,@Request() userRequest:{user:{payload:SessionDto}}){
    try {
        const {user}=userRequest;
        const {payload} =user
        const deleted=await this.service.deleteProjet(id,payload.id);
        console.log(deleted)
        console.log("Projet supprimé avec succès")
    } catch (error) {
        throw error;
    }
   }
}






















