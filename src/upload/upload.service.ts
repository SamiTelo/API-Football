import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Express } from 'express';
import cloudinary from 'src/config/cloudinary.config';

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  /* --------------------------------------------------------------------------
   * SAVE PLAYER IMAGE (avec suppression ancienne image)
   * -------------------------------------------------------------------------- */
  async savePlayerImage(playerId: number, file: Express.Multer.File) {
    if (!file?.path || !file?.filename) {
      throw new BadRequestException('Fichier image invalide');
    }

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException('Joueur introuvable');
    }

    // suppression ancienne image Cloudinary
    if (player.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(player.cloudinaryPublicId, {
        invalidate: true,
      });
    }

    return this.prisma.player.update({
      where: { id: playerId },
      data: {
        imageUrl: file.path,
        cloudinaryPublicId: file.filename,
      },
    });
  }

  /* --------------------------------------------------------------------------
   * SAVE TEAM LOGO (avec suppression ancien logo)
   * -------------------------------------------------------------------------- */
  async saveTeamLogo(teamId: number, file: Express.Multer.File) {
    if (!file?.path || !file?.filename) {
      throw new BadRequestException('Fichier image invalide');
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Équipe introuvable');
    }

    // suppression ancien logo Cloudinary
    if (team.cloudinaryLogoId) {
      await cloudinary.uploader.destroy(team.cloudinaryLogoId, {
        invalidate: true,
      });
    }

    return this.prisma.team.update({
      where: { id: teamId },
      data: {
        logoUrl: file.path,
        cloudinaryLogoId: file.filename,
      },
    });
  }

  /* --------------------------------------------------------------------------
   * GET PLAYER IMAGE PUBLIC ID
   * -------------------------------------------------------------------------- */
  async getPlayerImagePublicId(playerId: number): Promise<string> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { cloudinaryPublicId: true },
    });

    if (!player?.cloudinaryPublicId) {
      throw new NotFoundException('Image introuvable');
    }

    return player.cloudinaryPublicId;
  }

  /* --------------------------------------------------------------------------
   * GET TEAM LOGO PUBLIC ID
   * -------------------------------------------------------------------------- */
  async getTeamLogoPublicId(teamId: number): Promise<string> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { cloudinaryLogoId: true },
    });

    if (!team?.cloudinaryLogoId) {
      throw new NotFoundException('Logo introuvable');
    }

    return team.cloudinaryLogoId;
  }

  /* --------------------------------------------------------------------------
   * SIGNED IMAGE URL (PRIVATE)
   * -------------------------------------------------------------------------- */
  getSignedImage(publicId: string) {
    if (!publicId) {
      throw new BadRequestException('publicId requis');
    }

    return cloudinary.url(publicId, {
      type: 'authenticated',
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 60,
    });
  }

  /**
   * Méthodes futures :
   * - upload de documents, vidéos, etc.
   */
}
