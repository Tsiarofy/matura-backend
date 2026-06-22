import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { TypeStade } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { MissionItemDto } from './dto/creer-missions.dto'
import { EvaluerMissionDto } from './dto/evaluer-mission.dto'

const NUM_TO_TYPE: Record<number, TypeStade> = {
  1: TypeStade.STADE_1_EMERGENCE,
  2: TypeStade.STADE_2_IDEATION,
  3: TypeStade.STADE_3_MARCHE,
  4: TypeStade.STADE_4_BMC,
  5: TypeStade.STADE_5_FAISABILITE,
  6: TypeStade.STADE_6_PROTOTYPE,
  7: TypeStade.STADE_7_LANCEMENT,
}

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getProjetStade(projetId: string, numStade: number, userId: string) {
    const type = NUM_TO_TYPE[numStade]
    if (!type) throw new BadRequestException('STADE_INVALIDE')

    const projet = await this.prisma.projet.findUnique({
      where: { id: projetId },
      include: { stades: { where: { type } } },
    })

    if (!projet) throw new NotFoundException('PROJET_INTROUVABLE')

    const isProprietaire = projet.proprietaire_id === userId
    const isMentor = projet.mentor_id === userId

    if (!isProprietaire && !isMentor) {
      throw new ForbiddenException('NON_AUTORISE')
    }

    const stade = projet.stades[0]
    if (!stade) throw new NotFoundException('STADE_INTROUVABLE')

    return { projet, stade, isProprietaire, isMentor }
  }

  async getMissions(projetId: string, numStade: number, userId: string) {
    const { projet, stade } = await this.getProjetStade(projetId, numStade, userId)

    const missions = await this.prisma.missionStade.findMany({
      where: { stade_id: stade.id },
      orderBy: { ordre: 'asc' },
      include: {
        fichiers_requis: { orderBy: { ordre: 'asc' } },
        soumissions: {
          where: { entrepreneur_id: projet.proprietaire_id },
          include: { fichiers: true },
        },
      },
    })

    return missions.map((mission) => {
      const soumission = mission.soumissions[0] ?? null

      return {
        id: mission.id,
        ordre: mission.ordre,
        titre: mission.titre,
        objectif: mission.objectif,
        fichiers_requis: mission.fichiers_requis.map((fr) => ({
          id: fr.id,
          type: fr.type,
          description: fr.description,
          ordre: fr.ordre,
        })),
        date_limite: mission.date_limite?.toISOString() ?? null,
        statut: soumission?.statut ?? 'INACHEVEE',
        soumission: soumission
          ? {
              id: soumission.id,
              commentaire: soumission.commentaire,
              motif_rejet: soumission.motif_rejet,
              soumis_le: soumission.soumis_le?.toISOString() ?? null,
              valide_le: soumission.valide_le?.toISOString() ?? null,
              fichiers: soumission.fichiers.map((f) => ({
                id: f.id,
                fichier_requis_id: f.fichier_requis_id,
                fichier_url: f.fichier_url,
                fichier_nom: f.fichier_nom,
                fichier_type: f.fichier_type,
              })),
            }
          : null,
      }
    })
  }

  async creerMissions(
    projetId: string,
    numStade: number,
    mentorId: string,
    missions: MissionItemDto[],
  ) {
    console.log(`[creerMissions] RECEIVED REQUEST - projetId=${projetId}, numStade=${numStade}, mentorId=${mentorId}`);
    console.log('[creerMissions] Payload received:', JSON.stringify(missions, null, 2));

    const { projet, stade, isMentor } = await this.getProjetStade(projetId, numStade, mentorId)

    if (!isMentor) {
      throw new ForbiddenException('SEUL_LE_MENTOR_PEUT_CREER_DES_MISSIONS')
    }
    if (projet.mentor_id !== mentorId) {
      throw new ForbiddenException('MENTOR_NON_ASSIGNE')
    }
    if (stade.statut === 'VALIDE') {
      throw new ForbiddenException('STADE_VALIDE_MISSIONS_NON_MODIFIABLES')
    }

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Récupérer les missions existantes pour la vérification intelligente des dates
    const existingMissions = await this.prisma.missionStade.findMany({
      where: { stade_id: stade.id },
    })

    for (const mission of missions) {
      if (!mission.date_limite) continue
      const date = new Date(mission.date_limite)
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('DATE_LIMITE_INVALIDE')
      }

      const existing = mission.id ? existingMissions.find((m) => m.id === mission.id) : null
      if (existing) {
        const oldDateStr = existing.date_limite
          ? new Date(existing.date_limite).toISOString().split('T')[0]
          : null
        const newDateStr = new Date(mission.date_limite).toISOString().split('T')[0]
        // Si la date limite a changé, alors la nouvelle ne doit pas être dans le passé
        if (newDateStr !== oldDateStr && date < startOfToday) {
          throw new BadRequestException('DATE_LIMITE_PASSEE')
        }
      } else {
        if (date < startOfToday) {
          throw new BadRequestException('DATE_LIMITE_PASSEE')
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const currentMissions = await tx.missionStade.findMany({
        where: { stade_id: stade.id },
      })

      const payloadIds = missions.map((m) => m.id).filter(Boolean) as string[]

      const idsToDelete = currentMissions
        .filter((m) => !payloadIds.includes(m.id))
        .map((m) => m.id)

      if (idsToDelete.length > 0) {
        await tx.missionStade.deleteMany({
          where: { id: { in: idsToDelete } },
        })
      }

      for (let i = 0; i < missions.length; i++) {
        const mission = missions[i]
        const ordre = mission.ordre ?? i + 1
        const dateLimite = mission.date_limite ? new Date(mission.date_limite) : null

        if (mission.id) {
          // Mise à jour mission existante
          const existingMission = await tx.missionStade.findUnique({
            where: { id: mission.id },
            include: { fichiers_requis: { orderBy: { ordre: 'asc' } } }
          })
          if (!existingMission) continue

          // Vérifier que la mission n'est pas validée avant modification
          const soumissionValidee = await tx.missionSoumission.findFirst({
            where: { mission_id: mission.id, statut: 'VALIDEE' },
          })

          // Comparaison des exigences de fichiers requis
          const reqsModifiees = (() => {
            if (mission.fichiers_requis.length !== existingMission.fichiers_requis.length) {
              return true
            }
            for (let j = 0; j < mission.fichiers_requis.length; j++) {
              const frPayload = mission.fichiers_requis[j]
              const frDb = existingMission.fichiers_requis[j]
              if (frPayload.type !== frDb.type || frPayload.description !== frDb.description) {
                return true
              }
            }
            return false
          })()

          if (soumissionValidee) {
            // Mission validée : on ne touche pas aux exigences de fichiers
            await tx.missionStade.update({
              where: { id: mission.id },
              data: { ordre, titre: mission.titre, objectif: mission.objectif, date_limite: dateLimite },
            })
          } else {
            if (reqsModifiees) {
              // Si les exigences ont changé, on supprime la soumission existante car le travail n'est plus à jour
              const soumissionExistante = await tx.missionSoumission.findFirst({
                where: { mission_id: mission.id }
              })
              if (soumissionExistante) {
                await tx.fichierSoumission.deleteMany({ where: { soumission_id: soumissionExistante.id } })
                await tx.missionSoumission.update({
                  where: { id: soumissionExistante.id },
                  data: { statut: 'INACHEVEE', motif_rejet: null, commentaire: null, soumis_le: null }
                })
              }

              await tx.missionStade.update({
                where: { id: mission.id },
                data: { ordre, titre: mission.titre, objectif: mission.objectif, date_limite: dateLimite },
              })
              // Supprimer et recréer les exigences de fichiers requis
              await tx.fichierRequisMission.deleteMany({ where: { mission_id: mission.id } })
              for (let j = 0; j < mission.fichiers_requis.length; j++) {
                const fr = mission.fichiers_requis[j]
                await tx.fichierRequisMission.create({
                  data: {
                    mission_id: mission.id,
                    type: fr.type,
                    description: fr.description,
                    ordre: fr.ordre ?? j,
                  },
                })
              }
            } else {
              // Si les exigences n'ont PAS changé, on met à jour la mission mais on garde tout le reste intact
              await tx.missionStade.update({
                where: { id: mission.id },
                data: { ordre, titre: mission.titre, objectif: mission.objectif, date_limite: dateLimite },
              })
            }
          }
        } else {
          const nouvelleMission = await tx.missionStade.create({
            data: {
              stade_id: stade.id,
              mentor_id: mentorId,
              ordre,
              titre: mission.titre,
              objectif: mission.objectif,
              date_limite: dateLimite,
            },
          })
          for (let j = 0; j < mission.fichiers_requis.length; j++) {
            const fr = mission.fichiers_requis[j]
            await tx.fichierRequisMission.create({
              data: {
                mission_id: nouvelleMission.id,
                type: fr.type,
                description: fr.description,
                ordre: fr.ordre ?? j,
              },
            })
          }
        }
      }

      if (missions.length > 0) {
        await tx.stade.update({
          where: { id: stade.id },
          data: { missions_completees: false },
        })
      } else {
        await tx.stade.update({
          where: { id: stade.id },
          data: { missions_completees: true },
        })
      }
      console.log('[creerMissions] Prisma transaction completed successfully!');
    })

    return {
      created: missions.length,
      missions_completees: missions.length === 0,
    }
  }

  /**
   * Soumission multi-fichiers : l'entrepreneur soumet un lot de fichiers
   * (un par FichierRequisMission) en une seule fois.
   * fichiersMap : { [fichierRequisId]: { url, nom, type, taille } }
   */
  async soumettreReponse(
    projetId: string,
    numStade: number,
    missionId: string,
    entrepreneurId: string,
    fichiersMap: Record<string, { url: string; nom: string; type: string; taille: number }>,
    fichiersSupMap: Array<{ url: string; nom: string; type: string; taille: number }> = [],
    commentaire?: string,
  ) {
    const { stade, isProprietaire } = await this.getProjetStade(
      projetId,
      numStade,
      entrepreneurId,
    )

    if (!isProprietaire) {
      throw new ForbiddenException('SEUL_LE_PROPRIETAIRE_PEUT_SOUMETTRE')
    }
    if (stade.statut === 'VALIDE') {
      throw new ForbiddenException('STADE_VALIDE_SOUMISSION_INTERDITE')
    }

    const mission = await this.prisma.missionStade.findFirst({
      where: { id: missionId, stade_id: stade.id },
      include: { fichiers_requis: true },
    })

    if (!mission) throw new NotFoundException('MISSION_INTROUVABLE')

    // Vérifier que la mission n'est pas déjà validée
    const soumissionActuelle = await this.prisma.missionSoumission.findUnique({
      where: { mission_id_entrepreneur_id: { mission_id: missionId, entrepreneur_id: entrepreneurId } },
    })

    if (soumissionActuelle?.statut === 'VALIDEE') {
      throw new ForbiddenException('MISSION_DEJA_VALIDEE')
    }

    // Vérifier que tous les fichiers requis sont fournis
    const fichiersRequisIds = mission.fichiers_requis.map((fr) => fr.id)
    const manquants = fichiersRequisIds.filter((id) => !fichiersMap[id])
    if (manquants.length > 0) {
      throw new BadRequestException('TOUS_LES_FICHIERS_REQUIS')
    }

    // Vérifier que chaque fichier soumis correspond au type requis
    for (const fr of mission.fichiers_requis) {
      const f = fichiersMap[fr.id]
      if (f && f.type !== fr.type) {
        throw new BadRequestException(`TYPE_FICHIER_INVALIDE: attendu ${fr.type}, reçu ${f.type}`)
      }
    }

    await this.prisma.$transaction(async (tx) => {
      let soumission = await tx.missionSoumission.findUnique({
        where: { mission_id_entrepreneur_id: { mission_id: missionId, entrepreneur_id: entrepreneurId } },
      })

      if (soumission) {
        // Mettre à jour la soumission existante
        soumission = await tx.missionSoumission.update({
          where: { id: soumission.id },
          data: {
            statut: 'SOUMISE',
            soumis_le: new Date(),
            valide_le: null,
            motif_rejet: null,
            commentaire: commentaire ?? null,
          },
        })
        // Supprimer les anciens fichiers soumis
        await tx.fichierSoumission.deleteMany({ where: { soumission_id: soumission.id } })
      } else {
        soumission = await tx.missionSoumission.create({
          data: {
            mission_id: missionId,
            entrepreneur_id: entrepreneurId,
            statut: 'SOUMISE',
            soumis_le: new Date(),
            commentaire: commentaire ?? null,
          },
        })
      }

      // Créer les fichiers soumis requis
      for (const fichierId of fichiersRequisIds) {
        const f = fichiersMap[fichierId]
        await tx.fichierSoumission.create({
          data: {
            soumission_id: soumission.id,
            fichier_requis_id: fichierId,
            fichier_url: f.url,
            fichier_nom: f.nom,
            fichier_type: f.type,
            fichier_taille_octets: f.taille,
          },
        })
      }

      // Créer les fichiers supplémentaires
      for (const f of fichiersSupMap) {
        await tx.fichierSoumission.create({
          data: {
            soumission_id: soumission.id,
            fichier_requis_id: null,
            fichier_url: f.url,
            fichier_nom: f.nom,
            fichier_type: f.type,
            fichier_taille_octets: f.taille,
          },
        })
      }
    })

    return { statut: 'SOUMISE' }
  }

  async getMissionDetail(projetId: string, numStade: number, missionId: string, userId: string) {
    const projet = await this.prisma.projet.findUnique({
      where: { id: projetId },
      select: {
        proprietaire_id: true,
        mentor_id: true,
      },
    })

    if (!projet) {
      throw new NotFoundException('PROJET_INTROUVABLE')
    }

    if (projet.proprietaire_id !== userId && projet.mentor_id !== userId) {
      throw new ForbiddenException('NON_AUTORISE')
    }

    const mission = await this.prisma.missionStade.findUnique({
      where: { id: missionId },
      include: {
        fichiers_requis: { orderBy: { ordre: 'asc' } },
        soumissions: {
          where: { entrepreneur_id: projet.proprietaire_id },
          include: { fichiers: true },
          take: 1,
        },
        stade: {
          select: { projet_id: true, type: true },
        },
      },
    })

    if (!mission || mission.stade.projet_id !== projetId) {
      throw new NotFoundException('MISSION_INTROUVABLE')
    }

    const soumission = mission.soumissions[0] ?? null
    return {
      id: mission.id,
      titre: mission.titre,
      objectif: mission.objectif,
      fichiers_requis: mission.fichiers_requis.map((fr) => ({
        id: fr.id,
        type: fr.type,
        description: fr.description,
        ordre: fr.ordre,
      })),
      date_limite: mission.date_limite,
      ordre: mission.ordre,
      statut: soumission?.statut ?? 'INACHEVEE',
      soumission: soumission
        ? {
            id: soumission.id,
            statut: soumission.statut,
            commentaire: soumission.commentaire,
            motif_rejet: soumission.motif_rejet,
            soumis_le: soumission.soumis_le,
            valide_le: soumission.valide_le,
            fichiers: soumission.fichiers.map((f) => ({
              id: f.id,
              fichier_requis_id: f.fichier_requis_id,
              fichier_url: f.fichier_url,
              fichier_nom: f.fichier_nom,
              fichier_type: f.fichier_type,
            })),
          }
        : null,
    }
  }

  async evaluerMission(
    projetId: string,
    numStade: number,
    missionId: string,
    mentorId: string,
    dto: EvaluerMissionDto,
  ) {
    const { projet, stade, isMentor } = await this.getProjetStade(projetId, numStade, mentorId)

    if (!isMentor) {
      throw new ForbiddenException('SEUL_LE_MENTOR_PEUT_EVALUER')
    }
    if (stade.statut === 'VALIDE') {
      throw new ForbiddenException('STADE_VALIDE_EVALUATION_INTERDITE')
    }

    const mission = await this.prisma.missionStade.findFirst({
      where: { id: missionId, stade_id: stade.id },
    })

    if (!mission) throw new NotFoundException('MISSION_INTROUVABLE')

    const soumission = await this.prisma.missionSoumission.findUnique({
      where: {
        mission_id_entrepreneur_id: {
          mission_id: missionId,
          entrepreneur_id: projet.proprietaire_id,
        },
      },
    })

    if (!soumission || soumission.statut !== 'SOUMISE') {
      throw new BadRequestException('MISSION_NON_SOUMISE')
    }

    if (dto.decision === 'REJETEE' && !dto.motif_rejet?.trim()) {
      throw new BadRequestException('MOTIF_REQUIS')
    }

    await this.prisma.missionSoumission.update({
      where: { id: soumission.id },
      data: {
        statut: dto.decision,
        motif_rejet: dto.decision === 'REJETEE' ? dto.motif_rejet!.trim() : null,
        valide_le: dto.decision === 'VALIDEE' ? new Date() : null,
      },
    })

    const toutesLesMissions = await this.prisma.missionStade.findMany({
      where: { stade_id: stade.id },
      include: {
        soumissions: {
          where: { entrepreneur_id: projet.proprietaire_id },
        },
      },
    })

    const toutesValidees =
      toutesLesMissions.length > 0 &&
      toutesLesMissions.every((item) => item.soumissions[0]?.statut === 'VALIDEE')

    await this.prisma.stade.update({
      where: { id: stade.id },
      data: { missions_completees: toutesValidees || toutesLesMissions.length === 0 },
    })

    // Notification à l'entrepreneur
    await this.prisma.notification.create({
      data: {
        utilisateur_id: projet.proprietaire_id,
        type: dto.decision === 'VALIDEE' ? 'MISSION_VALIDEE' : 'MISSION_REJETEE',
        titre: dto.decision === 'VALIDEE' ? 'Mission validée' : 'Mission rejetée',
        corps:
          dto.decision === 'VALIDEE'
            ? `La mission "${mission.titre}" a été validée.`
            : `La mission "${mission.titre}" a été rejetée. Motif : ${dto.motif_rejet || 'Non renseigné'}`,
        lien_relatif: `/projets/${projetId}/stades/${numStade}`,
      },
    })

    return {
      statut: dto.decision,
      missions_completees: toutesValidees,
    }
  }

  async supprimerMission(projetId: string, numStade: number, missionId: string, mentorId: string) {
    const { projet, stade, isMentor } = await this.getProjetStade(projetId, numStade, mentorId)

    if (!isMentor) {
      throw new ForbiddenException('SEUL_LE_MENTOR_PEUT_SUPPRIMER')
    }
    if (stade.statut === 'VALIDE') {
      throw new ForbiddenException('STADE_VALIDE_MISSIONS_NON_MODIFIABLES')
    }

    const mission = await this.prisma.missionStade.findFirst({
      where: { id: missionId, stade_id: stade.id },
    })

    if (!mission) throw new NotFoundException('MISSION_INTROUVABLE')

    // Bloquer la suppression si la mission est validée
    const soumissionValidee = await this.prisma.missionSoumission.findFirst({
      where: { mission_id: missionId, statut: 'VALIDEE' },
    })
    if (soumissionValidee) {
      throw new ForbiddenException('MISSION_VALIDEE_NON_MODIFIABLE')
    }

    await this.prisma.missionStade.delete({ where: { id: missionId } })

    const restantes = await this.prisma.missionStade.findMany({
      where: { stade_id: stade.id },
      include: {
        soumissions: {
          where: { entrepreneur_id: projet.proprietaire_id },
        },
      },
    })

    const toutesValidees =
      restantes.length === 0 ||
      restantes.every((item) => item.soumissions[0]?.statut === 'VALIDEE')

    await this.prisma.stade.update({
      where: { id: stade.id },
      data: { missions_completees: toutesValidees },
    })

    return { deleted: missionId }
  }
}
