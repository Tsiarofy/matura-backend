import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma, TypeNotification } from '@prisma/client'
import { Cron } from '@nestjs/schedule'

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async creer(
    tx: Prisma.TransactionClient | null,
    data: {
      utilisateur_id: string
      type: TypeNotification
      titre: string
      corps: string
      lien_relatif?: string
    },
  ) {
    const client = tx || this.prisma
    return client.notification.create({
      data: {
        utilisateur_id: data.utilisateur_id,
        type: data.type,
        titre: data.titre,
        corps: data.corps,
        lien_relatif: data.lien_relatif ?? null,
      },
    })
  }

  async getMiennes(userId: string) {
    return this.prisma.notification.findMany({
      where: { utilisateur_id: userId },
      orderBy: { cree_le: 'desc' },
      take: 30,
    })
  }

  async compterNonLues(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { utilisateur_id: userId, lue: false },
    })
  }

  async marquerLue(notifId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notifId, utilisateur_id: userId },
      data: { lue: true },
    })
  }

  async marquerToutesLues(userId: string) {
    return this.prisma.notification.updateMany({
      where: { utilisateur_id: userId, lue: false },
      data: { lue: true },
    })
  }

  @Cron('0 8 * * *', { name: 'rappels-missions' })
  async envoyerRappelsMissions() {
    const dans48h = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const maintenant = new Date()

    const missionsProches = await this.prisma.missionStade.findMany({
      where: {
        date_limite: { gte: maintenant, lte: dans48h },
        soumissions: {
          none: { statut: { in: ['SOUMISE', 'VALIDEE'] } },
        },
      },
      include: {
        stade: {
          include: {
            projet: {
              include: {
                proprietaire: { select: { id: true, prenom: true } },
              },
            },
          },
        },
      },
    })

    for (const mission of missionsProches) {
      const entrepreneur = mission.stade.projet.proprietaire
      const numStade = mission.stade.type.split('_')[1]
      await this.prisma.notification.create({
        data: {
          utilisateur_id: entrepreneur.id,
          type: 'MISSION_DEADLINE_PROCHE',
          titre: 'Mission bientôt en retard',
          corps: `La mission "${mission.titre}" doit être soumise avant le ${mission.date_limite?.toLocaleDateString('fr-FR')}.`,
          lien_relatif: `/projets/${mission.stade.projet_id}/stades/${numStade}`,
        },
      })
    }
  }
}
