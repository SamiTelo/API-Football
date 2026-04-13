import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Param,
  BadRequestException,
  ParseIntPipe,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { cloudinaryStorage } from './cloudinary.storage';
import { UploadImageDto } from './dto/upload-image.dto';
import { Express } from 'express';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Upload')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /* -------------------------------------------------------------------------- */
  /* UPLOAD IMAGE PLAYER */
  /* -------------------------------------------------------------------------- */

  @ApiOperation({ summary: 'Upload a player image' })
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl
  @Throttle({ limit: 10, ttl: 60 })
  @Post('player/:id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: cloudinaryStorage('players'),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new BadRequestException('Format image invalide'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadImageDto })
  async uploadPlayerImage(
    @Param('id', ParseIntPipe) playerId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Fichier manquant');
    }

    return this.uploadService.savePlayerImage(playerId, file);
  }

  /* -------------------------------------------------------------------------- */
  /* UPLOAD LOGO TEAM */
  /* -------------------------------------------------------------------------- */

  @ApiOperation({ summary: 'Upload a team logo' })
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl
  @Throttle({ limit: 10, ttl: 60 })
  @Post('team/:id/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: cloudinaryStorage('teams'),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new BadRequestException('Format image invalide'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadImageDto })
  async uploadTeamLogo(
    @Param('id', ParseIntPipe) teamId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Fichier manquant');
    }

    return this.uploadService.saveTeamLogo(teamId, file);
  }

  /* -------------------------------------------------------------------------- */
  /* GET SIGNED IMAGE PLAYER */
  /* -------------------------------------------------------------------------- */

  @ApiOperation({ summary: 'Récupérer image d’un joueur' })
  @Get('player/:id/image')
  async getPlayerSignedImage(@Param('id', ParseIntPipe) playerId: number) {
    return this.uploadService.getPlayerSignedImage(playerId);
  }

  /* -------------------------------------------------------------------------- */
  /* GET SIGNED LOGO TEAM */
  /* -------------------------------------------------------------------------- */

  @ApiOperation({ summary: 'Récupérer logo d’une équipe' })
  @Get('team/:id/logo')
  async getTeamSignedLogo(@Param('id', ParseIntPipe) teamId: number) {
    return this.uploadService.getTeamSignedLogo(teamId);
  }
}
