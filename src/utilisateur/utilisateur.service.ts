import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProfilEntrepreneurSchema,
  ProfilMentorSchema,
  ProfilInvestisseurSchema,
} from '@matura/shared';

@Injectable()
export class UtilisateurService {
  private readonly logger = new Logger(UtilisateurService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfilComplet(userId: string) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        role: true,
        statut_compte: true,
        url_avatar: true,
        profil: true,
        cree_le: true,
        maj_le: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Validation permissive : nettoyer les données selon le rôle
    const profilValide = this.validerProfilSelonRole(user.role, user.profil);

    return {
      ...user,
      profil: profilValide,
    };
  }

  async majProfil(userId: string, role: string, dto: any) {
    // Validation permissive : nettoyer les données selon le rôle
    const profilValide = this.validerProfilSelonRole(role, dto);
  console.log("PROFIL VALIDE - - - - - - - - - -- - - --")
  console.log(profilValide.url_avatar);
  
    const updated = await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { profil: profilValide },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        role: true,
        statut_compte: true,
        url_avatar: true,
        profil: true,
        cree_le: true,
        maj_le: true,
      },
    });

    return updated;
  }

  async majAvatar(userId: string, urlAvatar: string) {
    const updated = await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { url_avatar: urlAvatar },
      select: {
        id: true,
        url_avatar: true,
      },
    });

    return updated;
  }

  async getProfilPublic(userId: string) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        id: true,
        prenom: true,
        nom: true,
        role: true,
        url_avatar: true,
        profil: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Profil public : tout est visible selon la demande utilisateur
    return {
      id: user.id,
      prenom: user.prenom,
      nom: user.nom,
      role: user.role,
      url_avatar: user.url_avatar,
      profil: user.profil,
    };
  }

  private validerProfilSelonRole(role: string, profil: any) {
    if (!profil) return {};

    try {
      switch (role) {
        case 'ENTREPRENEUR':
          return ProfilEntrepreneurSchema.parse(profil);
        case 'MENTOR':
          return ProfilMentorSchema.parse(profil);
        case 'INVESTISSEUR':
          return ProfilInvestisseurSchema.parse(profil);
        default:
          return profil;
      }
    } catch (error) {
      // Validation permissive : en cas d'erreur, retourner les données nettoyées
      // Utilisation du logger NestJS pour la surveillance
      this.logger.warn(`Échec de la validation stricte pour le rôle ${role}. Application du nettoyage permissif. Détails: ${error}`);
      return this.nettoyerProfil(role, profil);
    }
  }

  private nettoyerProfil(role: string, profil: any) {
    // Nettoyage basique selon le rôle
    const nettoye: any = {};

    switch (role) {
      case 'ENTREPRENEUR':
        if (profil.telephone) nettoye.telephone = String(profil.telephone);
        if (profil.ville) nettoye.ville = String(profil.ville);
        if (profil.region) nettoye.region = String(profil.region);
        if (profil.bio) nettoye.bio = String(profil.bio).slice(0, 500);
        if (profil.secteur_activite) nettoye.secteur_activite = String(profil.secteur_activite);
        if (profil.parcours) nettoye.parcours = String(profil.parcours).slice(0, 1000);
        if (profil.linkedin_url) nettoye.linkedin_url = String(profil.linkedin_url);
        if (profil.type_cible && ['B2C', 'B2B', 'B2B2C'].includes(profil.type_cible)) {
          nettoye.type_cible = profil.type_cible;
        }
        break;

      case 'MENTOR':
        if (profil.telephone) nettoye.telephone = String(profil.telephone);
        if (profil.ville) nettoye.ville = String(profil.ville);
        if (profil.region) nettoye.region = String(profil.region);
        if (profil.bio) nettoye.bio = String(profil.bio).slice(0, 500);
        if (Array.isArray(profil.domaines_expertise)) {
          nettoye.domaines_expertise = profil.domaines_expertise.map(String);
        }
        if (profil.annees_experience) nettoye.annees_experience = Number(profil.annees_experience);
        if (profil.linkedin_url) nettoye.linkedin_url = String(profil.linkedin_url);
        if (typeof profil.disponible === 'boolean') {
          nettoye.disponible = profil.disponible;
        }
        break;

      case 'INVESTISSEUR':
        if (profil.telephone) nettoye.telephone = String(profil.telephone);
        if (profil.ville) nettoye.ville = String(profil.ville);
        if (profil.region) nettoye.region = String(profil.region);
        if (profil.bio) nettoye.bio = String(profil.bio).slice(0, 500);
        if (profil.sous_type) nettoye.sous_type = profil.sous_type;
        if (Array.isArray(profil.domaines_interet)) {
          nettoye.domaines_interet = profil.domaines_interet.map(String);
        }
        if (profil.budget_min_ar) nettoye.budget_min_ar = Number(profil.budget_min_ar);
        if (profil.budget_max_ar) nettoye.budget_max_ar = Number(profil.budget_max_ar);
        if (profil.linkedin_url) nettoye.linkedin_url = String(profil.linkedin_url);
        if (profil.site_web) nettoye.site_web = String(profil.site_web);
        break;

      default:
        return profil;
    }

    return nettoye;
  }
}
