import { Controller, Get, Post, UseInterceptors, UploadedFile, BadRequestException , Param, Headers, Res, NotFoundException} from '@nestjs/common';
// import { Controller, Get, Post,UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common'
import { Response } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}



  @Get('uploads/videos/:filename')
streamVideo(
  @Param('filename') filename: string,
  @Headers('range') range: string,
  @Res() res: Response,
) {
  const videoPath = path.join(process.cwd(), 'uploads/videos', filename)

  if (!fs.existsSync(videoPath)) {
    throw new NotFoundException('Vidéo introuvable')
  }

  const fileSize = fs.statSync(videoPath).size
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
  }
  const contentType = mimeTypes[ext] ?? 'video/octet-stream'

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1
    const chunkSize = end - start + 1

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    })

    fs.createReadStream(videoPath, { start, end }).pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    })
    fs.createReadStream(videoPath).pipe(res)
  }
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
    console.log(`/uploads/avatars/${file.filename}`)
    return {
      url: `/uploads/avatars/${file.filename}`,
      message: 'Avatar uploadé avec succès'
    };
  }

  @Post('upload/video')
  @UseInterceptors(FileInterceptor('video', {
    storage: diskStorage({
      destination: './uploads/videos',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),

    fileFilter: (req, file, cb) => {
      console.log(file.originalname)
      if (!file.originalname.match(/\.(mp4|avi|mov|webm)$/i)) {
        return cb(new BadRequestException('Seuls les fichiers vidéos sont autorisés!'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB
    }
  }))

  uploadVideo(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Aucun fichier uploadé');
    }
    return {
      url: `/uploads/videos/${file.filename}`,
      message: 'Vidéo uploadée avec succès'
    };
    
  }
}

