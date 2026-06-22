import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async createDocument(stadeId: string, data: { nom: string; url: string; type_fichier: string; description?: string; type_preuve?: string; taille_octets?: number }) {
    const stade = await this.prisma.stade.findUnique({ where: { id: stadeId } });
    if (!stade) {
      throw new NotFoundException('Stade introuvable');
    }

    return this.prisma.document.create({
      data: {
        stade_id: stadeId,
        ...data,
      },
    });
  }

  async getDocumentsByStade(stadeId: string) {
    return this.prisma.document.findMany({
      where: { stade_id: stadeId },
      orderBy: { uploade_le: 'desc' },
    });
  }

  async deleteDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException('Document introuvable');
    }
    return this.prisma.document.delete({ where: { id } });
  }
}
