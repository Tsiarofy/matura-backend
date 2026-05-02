import { Controller, Get, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('upload/avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new BadRequestException('Seuls les fichiers images sont autorisés!'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    }
  }))
  uploadAvatar(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Aucun fichier uploadé');
    }
    // Return the URL to access the file
    // Assumes backend is running on localhost:3000
    // If BASE_URL is needed, consider returning just the relative path
    // and let frontend prepend its VITE_BASE_URL
    return {
      url: `/uploads/avatars/${file.filename}`,
      message: 'Avatar uploadé avec succès'
    };
  }
}

