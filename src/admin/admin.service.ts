import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleUtilisateur, StatutCompte } from '@prisma/client';
import { MajStatutDto } from './dto/maj-statut.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const nb_entrepreneurs = await this.prisma.utilisateur.count({
      where: { role: RoleUtilisateur.ENTREPRENEUR },
    });

    const nb_mentors_approuves = await this.prisma.utilisateur.count({
      where: { role: RoleUtilisateur.MENTOR, statut_compte: StatutCompte.APPROUVE },
    });
    
    const nb_mentors_en_attente = await this.prisma.utilisateur.count({
      where: { role: RoleUtilisateur.MENTOR, statut_compte: StatutCompte.EN_ATTENTE },
    });

    const nb_investisseurs_approuves = await this.prisma.utilisateur.count({
      where: { role: RoleUtilisateur.INVESTISSEUR, statut_compte: StatutCompte.APPROUVE },
    });
    
    const nb_investisseurs_en_attente = await this.prisma.utilisateur.count({
      where: { role: RoleUtilisateur.INVESTISSEUR, statut_compte: StatutCompte.EN_ATTENTE },
    });

    const nb_projets = await this.prisma.projet.count();
    
    const nb_projets_diplomes = await this.prisma.projet.count({
      where: { statut: 'DIPLOME' },
    });

    return {
      nb_entrepreneurs,
      nb_mentors_approuves,
      nb_mentors_en_attente,
      nb_investisseurs_approuves,
      nb_investisseurs_en_attente,
      nb_projets,
      nb_projets_diplomes,
    };
  }

  async getMentors() {
    return this.prisma.utilisateur.findMany({
      where: { role: RoleUtilisateur.MENTOR },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        statut_compte: true,
        profil: true,
        cree_le: true,
        url_avatar: true,
      },
      orderBy: { cree_le: 'desc' },
    });
  }

  async getInvestisseurs() {
    return this.prisma.utilisateur.findMany({
      where: { role: RoleUtilisateur.INVESTISSEUR },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        statut_compte: true,
        profil: true,
        cree_le: true,
        url_avatar: true,
      },
      orderBy: { cree_le: 'desc' },
    });
  }

  async getEntrepreneurs() {
    return this.prisma.utilisateur.findMany({
      where: { role: RoleUtilisateur.ENTREPRENEUR },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        statut_compte: true,
        profil: true,
        cree_le: true,
        url_avatar: true,
        _count: {
          select: { projets_possedes: true }
        }
      },
      orderBy: { cree_le: 'desc' },
    });
  }

  async majStatutCompte(id: string, dto: MajStatutDto) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return this.prisma.utilisateur.update({
      where: { id },
      data: {
        statut_compte: dto.statut,
      },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        role: true,
        statut_compte: true,
      }
    });
  }
}
