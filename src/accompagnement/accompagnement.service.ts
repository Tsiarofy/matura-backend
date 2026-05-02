// src/accompagnement/accompagnement.service.ts
// Service de gestion des demandes d'accompagnement (mentor ↔ entrepreneur)
// Adapté depuis new-features/featuresAdimin pour respecter la nouvelle architecture

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AccompagnementService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── ENVOYER UNE DEMANDE (ENTREPRENEUR) ──────────────────────────────────────
  async envoyerDemande(
    projetId: string,
    entrepreneurId: string,
    dto: { mentor_id: string; message?: string },
  ) {
    const projet = await this.prisma.projet.findUnique({ where: { id: projetId } })
    if (!projet) throw new NotFoundException('PROJET_INTROUVABLE')
    if (projet.proprietaire_id !== entrepreneurId) throw new ForbiddenException('NON_PROPRIETAIRE')

    // Un seul mentor peut être assigné à la fois
    if (projet.mentor_id) throw new ConflictException('MENTOR_DEJA_ASSIGNE')

    const mentor = await this.prisma.utilisateur.findUnique({ where: { id: dto.mentor_id } })
    if (!mentor || mentor.role !== 'MENTOR' || mentor.statut_compte !== 'APPROUVE')
      throw new NotFoundException('MENTOR_INTROUVABLE_OU_NON_DISPONIBLE')

    // Pas de doublon pour ce couple projet/mentor
    const existante = await this.prisma.demandeAccompagnement.findUnique({
      where: { projet_id_mentor_id: { projet_id: projetId, mentor_id: dto.mentor_id } },
    })
    if (existante) throw new ConflictException('DEMANDE_DEJA_EXISTANTE')

    const demande = await this.prisma.demandeAccompagnement.create({
      data: {
        projet_id: projetId,
        mentor_id: dto.mentor_id,
        message: dto.message ?? null,
        statut: 'EN_ATTENTE',
      },
    })

    return {
      id: demande.id,
      projet_id: demande.projet_id,
      mentor_id: demande.mentor_id,
      statut: demande.statut,
      cree_le: demande.cree_le.toISOString(),
    }
  }

  // ─── DEMANDES REÇUES PAR UN MENTOR ───────────────────────────────────────────
  async getMesDemandes(
    mentorId: string,
    params: { statut?: string; page?: number; limite?: number },
  ) {
    const page = params.page ?? 1
    const limite = Math.min(params.limite ?? 20, 100)
    const skip = (page - 1) * limite

    const where: Record<string, unknown> = { mentor_id: mentorId }
    if (params.statut) where.statut = params.statut

    const [demandes, total] = await Promise.all([
      this.prisma.demandeAccompagnement.findMany({
        where,
        skip,
        take: limite,
        orderBy: { cree_le: 'desc' },
        include: {
          projet: {
            select: {
              id: true,
              titre: true,
              domaine: true,
              brl_actuel: true,
              description: true,
              proprietaire: { select: { id: true, prenom: true, nom: true } },
            },
          },
        },
      }),
      this.prisma.demandeAccompagnement.count({ where }),
    ])

    return {
      demandes: demandes.map((d) => ({
        id: d.id,
        message: d.message,
        statut: d.statut,
        cree_le: d.cree_le.toISOString(),
        projet: d.projet,
      })),
      total,
      page,
      pages: Math.ceil(total / limite),
    }
  }

  // ─── DEMANDES ENVOYÉES PAR UN ENTREPRENEUR ────────────────────────────────────
  async getMesDemandesEnvoyees(projetId: string, entrepreneurId: string) {
    const projet = await this.prisma.projet.findUnique({ where: { id: projetId } })
    if (!projet) throw new NotFoundException('PROJET_INTROUVABLE')
    if (projet.proprietaire_id !== entrepreneurId) throw new ForbiddenException('NON_PROPRIETAIRE')

    const demandes = await this.prisma.demandeAccompagnement.findMany({
      where: { projet_id: projetId },
      orderBy: { cree_le: 'desc' },
      include: {
        mentor: {
          select: { id: true, prenom: true, nom: true, url_avatar: true, profil: true },
        },
      },
    })

    return demandes.map((d) => ({
      id: d.id,
      message: d.message,
      statut: d.statut,
      cree_le: d.cree_le.toISOString(),
      mentor: d.mentor,
    }))
  }

  // ─── RÉPONDRE À UNE DEMANDE (MENTOR : ACCEPTE / REFUSE) ──────────────────────
  async repondreDemande(
    demandeId: string,
    mentorId: string,
    dto: { statut: 'ACCEPTE' | 'REFUSE' },
  ) {
    const demande = await this.prisma.demandeAccompagnement.findUnique({
      where: { id: demandeId },
      include: { projet: true },
    })

    if (!demande) throw new NotFoundException('DEMANDE_INTROUVABLE')
    if (demande.mentor_id !== mentorId) throw new ForbiddenException('NON_AUTORISE')
    if (demande.statut !== 'EN_ATTENTE')
      throw new BadRequestException(`DEMANDE_DEJA_TRAITEE: ${demande.statut}`)

    if (dto.statut === 'ACCEPTE') {
      if (demande.projet.mentor_id) throw new ConflictException('MENTOR_DEJA_ASSIGNE')

      await this.prisma.$transaction(async (tx) => {
        // Accepter cette demande
        await tx.demandeAccompagnement.update({
          where: { id: demandeId },
          data: { statut: 'ACCEPTE' },
        })
        // Assigner le mentor au projet
        await tx.projet.update({
          where: { id: demande.projet_id },
          data: { mentor_id: mentorId },
        })
        // Refuser automatiquement les autres demandes EN_ATTENTE pour ce projet
        await tx.demandeAccompagnement.updateMany({
          where: {
            projet_id: demande.projet_id,
            id: { not: demandeId },
            statut: 'EN_ATTENTE',
          },
          data: { statut: 'REFUSE' },
        })
      })

      return {
        id: demandeId,
        statut: 'ACCEPTE',
        message: `Vous suivez maintenant le projet "${demande.projet.titre}".`,
      }
    } else {
      await this.prisma.demandeAccompagnement.update({
        where: { id: demandeId },
        data: { statut: 'REFUSE' },
      })
      return { id: demandeId, statut: 'REFUSE', message: 'Demande refusée.' }
    }
  }

  // ─── ANNULER UNE DEMANDE (ENTREPRENEUR) ──────────────────────────────────────
  async annulerDemande(demandeId: string, entrepreneurId: string) {
    const demande = await this.prisma.demandeAccompagnement.findUnique({
      where: { id: demandeId },
      include: { projet: true },
    })
    if (!demande) throw new NotFoundException('DEMANDE_INTROUVABLE')
    if (demande.projet.proprietaire_id !== entrepreneurId) throw new ForbiddenException('NON_AUTORISE')
    if (demande.statut !== 'EN_ATTENTE') throw new BadRequestException('DEMANDE_DEJA_TRAITEE')

    await this.prisma.demandeAccompagnement.delete({ where: { id: demandeId } })
    return { message: 'Demande annulée.' }
  }

  // ─── LISTE DES MENTORS DISPONIBLES (ENTREPRENEUR) ────────────────────────────
  async getMentorsDisponibles(params: { page?: number; limite?: number } = {}) {
    const page = params.page ?? 1
    const limite = Math.min(params.limite ?? 20, 100)
    const skip = (page - 1) * limite

    const [mentors, total] = await Promise.all([
      this.prisma.utilisateur.findMany({
        where: { role: 'MENTOR', statut_compte: 'APPROUVE' },
        select: {
          id: true,
          prenom: true,
          nom: true,
          url_avatar: true,
          profil: true,
        },
        skip,
        take: limite,
        orderBy: { nom: 'asc' },
      }),
      this.prisma.utilisateur.count({
        where: { role: 'MENTOR', statut_compte: 'APPROUVE' },
      }),
    ])

    return {
      mentors,
      total,
      page,
      pages: Math.ceil(total / limite),
    }
  }

  // ─── PROJETS SUIVIS (MENTOR) ────────────────────────────────────────────────
  async getProjetsSuivis(mentorId: string) {
    const projets = await this.prisma.projet.findMany({
      where: { mentor_id: mentorId },
      include: {
        proprietaire: { select: { id: true, prenom: true, nom: true } },
        stades: true,
        score: true,
      },
      orderBy: { maj_le: 'desc' },
    })

    const getNum = (type: string) => {
      const match = type.match(/STADE_(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    }

    return projets.map((p) => {
      // Le stade actif est soit celui en cours (SOUMIS, BROUILLON, EN_REVISION),
      // soit le dernier stade validé.
      const stade_actif = p.stades.find(
        (s) => ['SOUMIS', 'BROUILLON', 'EN_REVISION'].includes(s.statut)
      ) ?? p.stades.find(
        (s) => s.statut === 'VALIDE' && getNum(s.type) === p.brl_actuel
      ) ?? p.stades[p.stades.length - 1] // Fallback

      return {
        id: p.id,
        titre: p.titre,
        domaine: p.domaine,
        region: p.region,
        statut: p.statut,
        brl_actuel: p.brl_actuel,
        score_global: p.score?.score_global ?? null,
        cree_le: p.cree_le.toISOString(),
        maj_le: p.maj_le.toISOString(),
        proprietaire: p.proprietaire,
        stade_actif: stade_actif ? {
          type: stade_actif.type,
          numero: getNum(stade_actif.type),
          statut: stade_actif.statut,
          en_attente_evaluation: stade_actif.statut === 'SOUMIS',
        } : null,
      }
    })
  }
}
