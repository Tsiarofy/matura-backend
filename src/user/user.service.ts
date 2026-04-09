import { ForbiddenException, Injectable, UseGuards } from '@nestjs/common';
// import { IsEmail } from 'class-validator';
import { SingUpDto } from 'src/auth/dto/auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateDto } from 'src/projet/projet.dto';
// import {} from ".."
// type UserDto={

// }

@Injectable()
export class UserService {
   constructor(private readonly prisma: PrismaService) { }

   async getAllUser() {
      try {
         return this.prisma.utilisateur.findMany()
      } catch (error) {
         throw new Error("Erreur lors de la recuperation des utilisateurs")
      }
   }
   async getUserByMail(mail: string) {
      try {
         const user = await this.prisma.utilisateur.findUnique({
            where: { email: mail }
         })
         if (user) {
            return user;
         } else {
            const error = new ForbiddenException("Utilisateur introuvable")
            throw error;
         }
      } catch (error) {
         throw new Error(`Erreur lors de la récuperation de l'utilisateur avec l'email ${mail}`)
      }

   }
   async updateUser(id: string, data:UpdateDto) {
      try {
         const updated = await this.prisma.utilisateur.update({
            where: { id: id },
            data: data
         })

         return updated
      } catch (error) {
         console.error(error)
         const err = new Error(`Erreur lors de la modification des informations`)
         throw error
      }
   }
   async deleteUser(id:string) {
      try {
         const deleted = await this.prisma.utilisateur.delete({
            where: { id: id }
         })
         return deleted
      } catch (error) {
         // console.error(error)
         const err = new Error("Erreur lors de la suppression")
         throw err
      }

   }
   async createUser(UserDto:SingUpDto) {
      try {
         const user = await this.prisma.utilisateur.create({
            data: {
               email: UserDto.email,
               password: UserDto.password, // Note: password should be hashed before calling this
               nom: UserDto.nom,
               prenom: UserDto.prenom,
               role: UserDto.role,
               region: UserDto.region,
               telephone: UserDto.telephone,
            }
         })
         return user
      } catch (error) {
         console.error(error)
         const err = new Error("Erreur lors de la création de l'utilisateur")
         throw err
      }
   }
}
