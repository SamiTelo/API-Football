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
import { RolesGuard } from 'src/auth/guards/roles.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { cloudinaryStorage } from './cloudinary.storage';
import { UploadImageDto } from './dto/upload-image.dto';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /* --------------------------------------------------------------------------
   * UPLOAD IMAGE PLAYER
   * -------------------------------------------------------------------------- */
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload a players image' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Post('player/:id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: cloudinaryStorage('players'),
      limits: { fileSize: 5 * 1024 * 1024 },
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

  /* --------------------------------------------------------------------------
   * UPLOAD LOGO TEAM
   * -------------------------------------------------------------------------- */
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload a team logo' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Post('team/:id/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: cloudinaryStorage('teams'),
      limits: { fileSize: 5 * 1024 * 1024 },
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

  /* --------------------------------------------------------------------------
   * GET SIGNED IMAGE PLAYER
   * -------------------------------------------------------------------------- */
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Récupérer image d’un joueur' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Get('player/:id/image')
  async getPlayerSignedImage(@Param('id', ParseIntPipe) playerId: number) {
    const publicId = await this.uploadService.getPlayerImagePublicId(playerId);

    return {
      url: this.uploadService.getSignedImage(publicId),
    };
  }

  /* --------------------------------------------------------------------------
   * GET SIGNED LOGO TEAM
   * -------------------------------------------------------------------------- */
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Récupérer logo d’une équipe' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Get('team/:id/logo')
  async getTeamSignedLogo(@Param('id', ParseIntPipe) teamId: number) {
    const publicId = await this.uploadService.getTeamLogoPublicId(teamId);

    return {
      url: this.uploadService.getSignedImage(publicId),
    };
  }
}
