import {
  Injectable, ForbiddenException, NotFoundException,
  ConflictException, HttpException, HttpStatus, BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { DemandeReunionDto } from './dto/demande-reunion.dto'
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import { TypeReunion } from '@prisma/client'
import { Cron } from '@nestjs/schedule'

@Injectable()
export class ReunionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Helpers LiveKit ──────────────────────────────────────────────

  private genererNomRoom(reunionId: string): string {
    return `matura-room-${reunionId}`
  }

  private async genererToken(
    roomName: string,
    userId: string,
    userName: string,
  ): Promise<string> {
    const apiKey    = process.env.LIVEKIT_API_KEY!
    const apiSecret = process.env.LIVEKIT_API_SECRET!

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userName,
      ttl: '4h',
    })
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    })
    return at.toJwt()
  }

  // ── Cron : Expiration automatique (toutes les 15 minutes) ─────────

  @Cron('*/5 * * * *', { name: 'expirer-reunions' })
  async expirerReunions() {
    const maintenant = new Date()
    const quinzeMinutesMs = 15 * 60 * 1000

    // 1. Expiration classique après la durée maximale (ex: 2h)
    await this.prisma.reunionSession.updateMany({
      where: {
        statut: { in: ['CONFIRME', 'EN_COURS'] },
        expire_le: { lt: maintenant },
      },
      data: { statut: 'EXPIREE' },
    })

    // 2. Récupérer toutes les réunions actives pour les contrôles d'inactivité
    const reunionsActives = await this.prisma.reunionSession.findMany({
      where: {
        statut: { in: ['CONFIRME', 'EN_COURS'] },
      },
    })

    const apiKey = process.env.LIVEKIT_API_KEY!
    const apiSecret = process.env.LIVEKIT_API_SECRET!
    const wsUrl = process.env.LIVEKIT_WS_URL!
    const httpUrl = wsUrl ? wsUrl.replace(/^ws/, 'http') : ''

    let roomService: RoomServiceClient | null = null;
    try {
      if (apiKey && apiSecret && httpUrl) {
        roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret)
      }
    } catch (e) {
      console.error("Impossible d'initialiser RoomServiceClient :", e)
    }

    for (const r of reunionsActives) {
      const isInstantane = r.date_planifiee === null
      const dateDeDepart = isInstantane ? r.cree_le : r.date_planifiee!
      const tempsEcoule = maintenant.getTime() - dateDeDepart.getTime()

      // Cas B : Quelqu'un n'a pas rejoint après 15 minutes de lancement (instant) ou de début (réservé)
      if (tempsEcoule > quinzeMinutesMs && (!r.initiateur_joint || !r.participant_joint)) {
        await this.prisma.reunionSession.update({
          where: { id: r.id },
          data: { statut: 'EXPIREE' },
        })
        continue
      }

      // Cas A : Les deux ont rejoint au moins une fois, on invalide si la salle est vide depuis 15 minutes
      if (r.initiateur_joint && r.participant_joint) {
        let roomActive = false
        if (roomService && r.livekit_room) {
          try {
            const rooms = await roomService.listRooms([r.livekit_room])
            const room = rooms.find(room => room.name === r.livekit_room)
            roomActive = !!room && room.numParticipants > 0
          } catch (err) {
            // En cas d'erreur de LiveKit (salle fermée ou inexistante), on considère la salle comme vide
            roomActive = false
          }
        }

        if (!roomActive) {
          if (!r.vide_depuis) {
            // Marquer le début de la période vide
            await this.prisma.reunionSession.update({
              where: { id: r.id },
              data: { vide_depuis: maintenant },
            })
          } else {
            const tempsVide = maintenant.getTime() - r.vide_depuis.getTime()
            if (tempsVide > quinzeMinutesMs) {
              await this.prisma.reunionSession.update({
                where: { id: r.id },
                data: { statut: 'TERMINEE' },
              })
            }
          }
        } else {
          // La salle est réoccupée, on réinitialise vide_depuis
          if (r.vide_depuis) {
            await this.prisma.reunionSession.update({
              where: { id: r.id },
              data: { vide_depuis: null },
            })
          }
        }
      }
    }
  }

  // ── POST /reunions/demande ───────────────────────────────────────

  async creerDemande(initiateurId: string, dto: DemandeReunionDto) {
    if (initiateurId === dto.participant_id) {
      throw new ForbiddenException('Vous ne pouvez pas vous inviter vous-même.')
    }

    const projet = await this.prisma.projet.findUnique({ where: { id: dto.projet_id } })
    if (!projet) throw new NotFoundException('Projet introuvable.')

    if (dto.date_planifiee) {
      const dateDemande = new Date(dto.date_planifiee)
      if (dateDemande.getTime() <= Date.now()) {
        throw new BadRequestException('La date de la réunion doit être dans le futur.')
      }
      await this.verifierDisponibilite(dto.participant_id, dateDemande)
    }

    const dureeHeures = parseInt(process.env.REUNION_DUREE_HEURES ?? '2', 10)

    const reunion = await this.prisma.reunionSession.create({
      data: {
        type:           dto.type as TypeReunion,
        statut:         'EN_ATTENTE',
        initiateur_id:  initiateurId,
        participant_id: dto.participant_id,
        projet_id:      dto.projet_id,
        date_planifiee: dto.date_planifiee ? new Date(dto.date_planifiee) : null,
        expire_le: dto.date_planifiee
          ? new Date(new Date(dto.date_planifiee).getTime() + dureeHeures * 3600 * 1000)
          : null,
      },
      include: { initiateur: true, participant: true },
    })

    await this.notifications.creer(null, {
      utilisateur_id: dto.participant_id,
      type:           'REUNION_DEMANDEE',
      titre:          'Nouvelle demande de réunion',
      corps: dto.date_planifiee
        ? `${reunion.initiateur.prenom} ${reunion.initiateur.nom} vous propose une réunion le [DATE:${dto.date_planifiee}].`
        : `${reunion.initiateur.prenom} ${reunion.initiateur.nom} vous propose un appel instantané.`,
      lien_relatif: `/reunions/${reunion.id}`,
    })

    return reunion
  }

  // ── PATCH /reunions/:id/confirmer ────────────────────────────────

  async confirmerReunion(reunionId: string, userId: string) {
    const reunion = await this.prisma.reunionSession.findUnique({
      where: { id: reunionId },
      include: { initiateur: true, participant: true },
    })
    if (!reunion) throw new NotFoundException('Réunion introuvable.')
    if (reunion.participant_id !== userId) {
      throw new ForbiddenException('Seul le participant invité peut confirmer.')
    }
    if (reunion.statut !== 'EN_ATTENTE') {
      throw new ConflictException('Cette réunion ne peut plus être confirmée.')
    }

    const roomName = this.genererNomRoom(reunionId)
    const updated  = await this.prisma.reunionSession.update({
      where: { id: reunionId },
      data:  { statut: 'CONFIRME', livekit_room: roomName },
    })

    await this.notifications.creer(null, {
      utilisateur_id: reunion.initiateur_id,
      type:           'REUNION_CONFIRMEE',
      titre:          'Réunion confirmée',
      corps:          `${reunion.participant.prenom} ${reunion.participant.nom} a confirmé votre demande de réunion.`,
      lien_relatif:   `/reunions/${reunionId}`,
    })

    return updated
  }

  // ── PATCH /reunions/:id/refuser ──────────────────────────────────

  async refuserReunion(reunionId: string, userId: string) {
    const reunion = await this.prisma.reunionSession.findUnique({
      where: { id: reunionId },
      include: { initiateur: true, participant: true },
    })
    if (!reunion) throw new NotFoundException('Réunion introuvable.')
    if (reunion.participant_id !== userId) {
      throw new ForbiddenException('Seul le participant invité peut refuser.')
    }
    if (reunion.statut !== 'EN_ATTENTE') {
      throw new ConflictException('Cette réunion ne peut plus être refusée.')
    }

    const updated = await this.prisma.reunionSession.update({
      where: { id: reunionId },
      data:  { statut: 'REFUSE' },
    })

    await this.notifications.creer(null, {
      utilisateur_id: reunion.initiateur_id,
      type:           'REUNION_REFUSEE',
      titre:          'Réunion refusée',
      corps:          `${reunion.participant.prenom} ${reunion.participant.nom} a refusé votre demande de réunion.`,
      lien_relatif:   `/reunions`,
    })

    return updated
  }

  // ── POST /reunions/instantane ────────────────────────────────────

  async creerInstantane(initiateurId: string, dto: DemandeReunionDto) {
    if (initiateurId === dto.participant_id) {
      throw new ForbiddenException('Vous ne pouvez pas vous appeler vous-même.')
    }

    const projet = await this.prisma.projet.findUnique({ where: { id: dto.projet_id } })
    if (!projet) throw new NotFoundException('Projet introuvable.')

    const initiateur = await this.prisma.utilisateur.findUnique({ where: { id: initiateurId } })

    const reunion = await this.prisma.reunionSession.create({
      data: {
        type:           dto.type as TypeReunion,
        statut:         'EN_COURS',
        initiateur_id:  initiateurId,
        participant_id: dto.participant_id,
        projet_id:      dto.projet_id,
        date_planifiee: null,
        expire_le:      new Date(Date.now() + 2 * 3600 * 1000),
        livekit_room:   null, // mis à jour juste après
      },
    })

    const roomName = this.genererNomRoom(reunion.id)
    const token    = await this.genererToken(
      roomName,
      initiateurId,
      `${initiateur?.prenom ?? ''} ${initiateur?.nom ?? ''}`,
    )

    const updated = await this.prisma.reunionSession.update({
      where: { id: reunion.id },
      data:  { livekit_room: roomName, livekit_token: token },
    })

    await this.notifications.creer(null, {
      utilisateur_id: dto.participant_id,
      type:           'APPEL_INSTANTANE',
      titre:          'Appel entrant',
      corps:          `${initiateur?.prenom} ${initiateur?.nom} vous appelle maintenant.`,
      lien_relatif:   `/reunions/${reunion.id}/rejoindre`,
    })

    return { ...updated, token, ws_url: process.env.LIVEKIT_WS_URL }
  }

  // ── GET /reunions/mes-reunions ───────────────────────────────────

  async listerMesReunions(userId: string) {
    return this.prisma.reunionSession.findMany({
      where: {
        OR: [{ initiateur_id: userId }, { participant_id: userId }],
        statut: { not: 'EXPIREE' },
      },
      include: {
        initiateur:  { select: { id: true, prenom: true, nom: true, role: true } },
        participant: { select: { id: true, prenom: true, nom: true, role: true } },
      },
      orderBy: [{ date_planifiee: 'asc' }],
    })
  }

  // ── GET /reunions/:id/rejoindre ──────────────────────────────────

  async rejoindreReunion(reunionId: string, userId: string) {
    const reunion = await this.prisma.reunionSession.findUnique({
      where: { id: reunionId },
      include: {
        initiateur:  { select: { id: true, prenom: true, nom: true } },
        participant: { select: { id: true, prenom: true, nom: true } },
      },
    })

    if (!reunion) throw new NotFoundException('Réunion introuvable.')
    if (reunion.initiateur_id !== userId && reunion.participant_id !== userId) {
      throw new ForbiddenException("Vous n'êtes pas participant à cette réunion.")
    }
    if (reunion.statut === 'EXPIREE') {
      throw new HttpException('Cette réunion a expiré.', HttpStatus.GONE) // 410
    }
    if (reunion.statut === 'REFUSE') {
      throw new ForbiddenException('Cette réunion a été refusée.')
    }
    if (reunion.statut === 'EN_ATTENTE') {
      throw new ForbiddenException("Cette réunion n'a pas encore été confirmée.")
    }

    // Vérification horaire pour les réunions planifiées
    if (reunion.date_planifiee) {
      const maintenant  = Date.now()
      const planifie    = new Date(reunion.date_planifiee).getTime()
      const fenetreMs   = parseInt(process.env.REUNION_FENETRE_MINUTES ?? '5', 10) * 60 * 1000
      const tropTot     = maintenant < planifie - fenetreMs

      if (tropTot) {
        const secondesRestantes = Math.floor((planifie - fenetreMs - maintenant) / 1000)
        throw new HttpException(
          {
            message:            'Réunion pas encore disponible.',
            secondes_restantes: secondesRestantes,
            date_planifiee:     reunion.date_planifiee.toISOString(),
          },
         423, // 423
        )
      }
    }

    const isInitiateur = reunion.initiateur_id === userId
    const user         = isInitiateur ? reunion.initiateur : reunion.participant
    const userName     = `${user.prenom} ${user.nom}`

    // Résilience : Si le nom de la room est manquant, on le génère à la volée et le met à jour en base
    let roomName = reunion.livekit_room
    if (!roomName) {
      roomName = this.genererNomRoom(reunionId)
      await this.prisma.reunionSession.update({
        where: { id: reunionId },
        data: { livekit_room: roomName },
      })
    }

    const token = await this.genererToken(roomName, userId, userName)

    // Marquer EN_COURS si pas encore, et marquer les jointures
    const updateData: any = {}
    if (reunion.statut === 'CONFIRME') {
      updateData.statut = 'EN_COURS'
    }
    if (isInitiateur) {
      updateData.initiateur_joint = true
    } else {
      updateData.participant_joint = true
    }
    
    // Si la room était vide/manquante initialement, on s'assure d'écrire aussi le nom de la room
    if (!reunion.livekit_room) {
      updateData.livekit_room = roomName
    }

    await this.prisma.reunionSession.update({
      where: { id: reunionId },
      data:  updateData,
    })

    return {
      token,
      ws_url:     process.env.LIVEKIT_WS_URL,
      room:       roomName,
      expires_at: reunion.expire_le?.toISOString(),
    }
  }

  // ── PATCH /reunions/:id/modifier-date ────────────────────────────

  async modifierDateReunion(reunionId: string, userId: string, nouvelleDate: string) {
    const reunion = await this.prisma.reunionSession.findUnique({
      where: { id: reunionId },
    })
    if (!reunion) throw new NotFoundException('Réunion introuvable.')
    if (reunion.initiateur_id !== userId && reunion.participant_id !== userId) {
      throw new ForbiddenException("Vous n'êtes pas participant à cette réunion.")
    }
    if (reunion.statut === 'REFUSE' || reunion.statut === 'TERMINEE' || reunion.statut === 'EXPIREE') {
      throw new ConflictException("Cette réunion ne peut plus être modifiée.")
    }

    const otherUserId = reunion.initiateur_id === userId ? reunion.participant_id : reunion.initiateur_id

    const dateDemande = new Date(nouvelleDate)
    if (dateDemande.getTime() <= Date.now()) {
      throw new BadRequestException('La date de la réunion doit être dans le futur.')
    }
    await this.verifierDisponibilite(otherUserId, dateDemande, reunionId)

    const dureeHeures = parseInt(process.env.REUNION_DUREE_HEURES ?? '2', 10)
    const updated = await this.prisma.reunionSession.update({
      where: { id: reunionId },
      data: {
        date_planifiee: dateDemande,
        statut: 'EN_ATTENTE',
        initiateur_id: userId,
        participant_id: otherUserId,
        initiateur_joint: false,
        participant_joint: false,
        vide_depuis: null,
        expire_le: new Date(dateDemande.getTime() + dureeHeures * 3600 * 1000),
      },
      include: { initiateur: true, participant: true },
    })

    await this.notifications.creer(null, {
      utilisateur_id: otherUserId,
      type: 'REUNION_DEMANDEE',
      titre: 'Date de réunion modifiée',
      corps: `${updated.initiateur.prenom} ${updated.initiateur.nom} propose une nouvelle date pour votre réunion : le [DATE:${dateDemande.toISOString()}].`,
      lien_relatif: `/reunions/${reunionId}`,
    })

    return updated
  }

  // Helper de vérification d'intervalle de 5 minutes
  private async verifierDisponibilite(userId: string, dateDemande: Date, exclusionReunionId?: string) {
    const cinqMinutesMs = 5 * 60 * 1000
    
    const meetingsExistantes = await this.prisma.reunionSession.findMany({
      where: {
        id: exclusionReunionId ? { not: exclusionReunionId } : undefined,
        OR: [{ initiateur_id: userId }, { participant_id: userId }],
        statut: { in: ['CONFIRME', 'EN_COURS'] },
        date_planifiee: { not: null },
      },
    })

    for (const m of meetingsExistantes) {
      if (m.date_planifiee) {
        const diff = Math.abs(m.date_planifiee.getTime() - dateDemande.getTime())
        if (diff < cinqMinutesMs) {
          throw new ConflictException("L'autre participant a déjà une réunion programmée ou confirmée dans cet intervalle de 5 minutes.")
        }
      }
    }
  }
}
