import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreerFormationDto } from './dto/creer-formation.dto'
import { CreerLessonDto } from './dto/creer-lesson.dto'
import { DomainProjet, TypeCible } from '@prisma/client'

@Injectable()
export class FormationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── HELPER : vérifier ownership ──────────────────────────────────────────

  private async verifierOwnership(formationId: string, userId: string, userRole: string) {
    const formation = await this.prisma.formation.findUnique({ where: { id: formationId } })
    if (!formation) throw new NotFoundException('FORMATION_INTROUVABLE')
    if (userRole === 'ADMIN') return formation  // Admin bypass
    if (formation.auteur_id !== userId) throw new ForbiddenException('NON_AUTORISE')
    // Vérifie aussi que le mentor est toujours APPROUVE avant toute mutation
    await this.verifierMentorApprouve(userId)
    return formation
  }

  // ─── HELPER : vérifier statut compte mentor ───────────────────────────────

  private async verifierMentorApprouve(userId: string) {
    const auteur = await this.prisma.utilisateur.findUnique({ where: { id: userId } })
    if (!auteur || auteur.statut_compte !== 'APPROUVE') {
      throw new ForbiddenException('COMPTE_NON_APPROUVE')
    }
  }

  // ─── LISTER LES FORMATIONS (avec filtres + pagination) ────────────────────

  async listerFormations(params: {
    domaine?: string
    stade_cible?: number
    type_cible?: string
    page?: number
    limite?: number
  }) {
    const page = params.page ?? 1
    const limite = Math.min(params.limite ?? 20, 100)
    const skip = (page - 1) * limite

    const where: Record<string, unknown> = {}
    if (params.domaine) where.domaine = params.domaine as DomainProjet
    if (params.stade_cible) where.stade_cible = params.stade_cible
    if (params.type_cible) where.type_cible = params.type_cible as TypeCible

    const [formations, total] = await Promise.all([
      this.prisma.formation.findMany({
        where,
        skip,
        take: limite,
        orderBy: { cree_le: 'desc' },
        include: {
          auteur: { select: { id: true, prenom: true, nom: true, url_avatar: true } },
          _count: { select: { lessons: true } },
        },
      }),
      this.prisma.formation.count({ where }),
    ])

    return {
      formations: formations.map((f) => ({
        id: f.id,
        titre: f.titre,
        description: f.description,
        domaine: f.domaine,
        stade_cible: f.stade_cible,
        type_cible: f.type_cible,
        auteur: f.auteur,
        nombre_lessons: f._count.lessons,
        cree_le: f.cree_le.toISOString(),
        maj_le: f.maj_le.toISOString(),
      })),
      total,
      page,
      pages: Math.ceil(total / limite),
    }
  }

  // ─── FORMATIONS DU MENTOR CONNECTÉ ────────────────────────────────────────

  async getMesFormations(auteurId: string, params: { page?: number; limite?: number }) {
    const page = params.page ?? 1
    const limite = Math.min(params.limite ?? 20, 100)
    const skip = (page - 1) * limite

    const where = { auteur_id: auteurId }

    const [formations, total] = await Promise.all([
      this.prisma.formation.findMany({
        where,
        skip,
        take: limite,
        orderBy: { cree_le: 'desc' },
        include: {
          auteur: { select: { id: true, prenom: true, nom: true, url_avatar: true } },
          _count: { select: { lessons: true } },
        },
      }),
      this.prisma.formation.count({ where }),
    ])

    return {
      formations: formations.map((f) => ({
        id: f.id,
        titre: f.titre,
        description: f.description,
        domaine: f.domaine,
        stade_cible: f.stade_cible,
        type_cible: f.type_cible,
        auteur: f.auteur,
        nombre_lessons: f._count.lessons,
        cree_le: f.cree_le.toISOString(),
        maj_le: f.maj_le.toISOString(),
      })),
      total,
      page,
      pages: Math.ceil(total / limite),
    }
  }

  // ─── DÉTAIL D'UNE FORMATION ───────────────────────────────────────────────

  async getFormationDetail(formationId: string, userId: string, userRole: string) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      include: {
        auteur: { select: { id: true, prenom: true, nom: true, url_avatar: true } },
        lessons: { orderBy: { ordre: 'asc' } },
        _count: { select: { lessons: true } },
      },
    })

    if (!formation) throw new NotFoundException('FORMATION_INTROUVABLE')

    // Un MENTOR ne peut voir que ses propres formations
    if (userRole === 'MENTOR' && formation.auteur_id !== userId) {
      throw new ForbiddenException('NON_AUTORISE')
    }

    return {
      id: formation.id,
      titre: formation.titre,
      description: formation.description,
      domaine: formation.domaine,
      stade_cible: formation.stade_cible,
      type_cible: formation.type_cible,
      auteur: formation.auteur,
      nombre_lessons: formation._count.lessons,
      lessons: formation.lessons,
      cree_le: formation.cree_le.toISOString(),
      maj_le: formation.maj_le.toISOString(),
    }
  }

  // ─── CRÉER UNE FORMATION ─────────────────────────────────────────────────

  async creerFormation(dto: CreerFormationDto, auteurId: string) {
    await this.verifierMentorApprouve(auteurId)

    const formation = await this.prisma.formation.create({
      data: {
        titre: dto.titre as string,
        description: dto.description ?? null,
        domaine: dto.domaine as DomainProjet,
        stade_cible: dto.stade_cible ?? null,
        type_cible: dto.type_cible ?? null,
        auteur_id: auteurId,
      },
      include: {
        auteur: { select: { id: true, prenom: true, nom: true, url_avatar: true } },
        _count: { select: { lessons: true } },
      },
    })

    return {
      id: formation.id,
      titre: formation.titre,
      description: formation.description,
      domaine: formation.domaine,
      stade_cible: formation.stade_cible,
      type_cible: formation.type_cible,
      auteur: formation.auteur,
      nombre_lessons: 0,
      cree_le: formation.cree_le.toISOString(),
      maj_le: formation.maj_le.toISOString(),
    }
  }

  // ─── MODIFIER UNE FORMATION ──────────────────────────────────────────────

  async modifierFormation(
    formationId: string,
    dto: Partial<CreerFormationDto>,
    userId: string,
    userRole: string,
  ) {
    await this.verifierOwnership(formationId, userId, userRole)

    return this.prisma.formation.update({
      where: { id: formationId },
      data: {
        ...(dto.titre && { titre: dto.titre }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.domaine && { domaine: dto.domaine }),
        ...(dto.stade_cible !== undefined && { stade_cible: dto.stade_cible }),
        ...(dto.type_cible !== undefined && { type_cible: dto.type_cible }),
      },
    })
  }

  // ─── SUPPRIMER UNE FORMATION (cascade sur lessons) ───────────────────────

  async supprimerFormation(formationId: string, userId: string, userRole: string) {
    await this.verifierOwnership(formationId, userId, userRole)
    await this.prisma.formation.delete({ where: { id: formationId } })
  }

  // ─── AJOUTER UNE LEÇON ───────────────────────────────────────────────────

  async ajouterLesson(
    formationId: string,
    dto: CreerLessonDto,
    userId: string,
    userRole: string,
  ) {
    await this.verifierOwnership(formationId, userId, userRole)

    return this.prisma.lesson.create({
      data: {
        formation_id: formationId,
        titre: dto.titre,
        ordre: dto.ordre,
        contenu_texte: dto.contenu_texte,
        url_video: dto.url_video,
      },
    })
  }

  // ─── MODIFIER UNE LEÇON ──────────────────────────────────────────────────

  async modifierLesson(
    formationId: string,
    lessonId: string,
    dto: Partial<CreerLessonDto>,
    userId: string,
    userRole: string,
  ) {
    await this.verifierOwnership(formationId, userId, userRole)

    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } })
    if (!lesson || lesson.formation_id !== formationId) {
      throw new NotFoundException('LECON_INTROUVABLE')
    }

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(dto.titre && { titre: dto.titre }),
        ...(dto.ordre !== undefined && { ordre: dto.ordre }),
        ...(dto.contenu_texte && { contenu_texte: dto.contenu_texte }),
        ...(dto.url_video && { url_video: dto.url_video }),
      },
    })
  }

  // ─── SUPPRIMER UNE LEÇON ─────────────────────────────────────────────────

  async supprimerLesson(
    formationId: string,
    lessonId: string,
    userId: string,
    userRole: string,
  ) {
    await this.verifierOwnership(formationId, userId, userRole)

    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } })
    if (!lesson || lesson.formation_id !== formationId) {
      throw new NotFoundException('LECON_INTROUVABLE')
    }

    await this.prisma.lesson.delete({ where: { id: lessonId } })
  }
}
