import { Controller, Post, Get, Delete, Param, UseInterceptors, UploadedFile, BadRequestException, Body, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as fs from 'fs';

// Assure that the upload directory exists
const uploadDir = './uploads/documents';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('stade/:stadeId/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|pdf|mp4|avi|mov|webm|doc|docx|xls|xlsx|ppt|pptx|txt)$/i;
      if (!file.originalname.match(allowedExtensions)) {
        return cb(new BadRequestException('Format de fichier non autorisé pour les preuves de stade!'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 15 * 1024 * 1024, // 15MB
    }
  }))
  
  async uploadDocument(
    @Param('stadeId') stadeId: string,
    @UploadedFile() file: any,
    @Body('type_preuve') type_preuve?: string,
    @Body('description') description?: string
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier uploadé');
    }

    const ext = extname(file.originalname).toLowerCase();
    let type_fichier = 'LIEN';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) type_fichier = 'IMAGE';
    else if (['.pdf'].includes(ext)) type_fichier = 'PDF';
    else if (['.mp4', '.avi', '.mov', '.webm'].includes(ext)) type_fichier = 'VIDEO';
    else type_fichier = 'AUTRE';
    
    return this.documentsService.createDocument(stadeId, {
      nom: file.originalname,
      url: `/uploads/documents/${file.filename}`,
      type_fichier,
      type_preuve,
      description,
      taille_octets: file.size,
    });
  }

  @Get('stade/:stadeId')
  getDocuments(@Param('stadeId') stadeId: string) {
    return this.documentsService.getDocumentsByStade(stadeId);
  }

  @Delete(':id')
  deleteDocument(@Param('id') id: string) {
    return this.documentsService.deleteDocument(id);
  }
}
