import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import cloudinary from '../config/cloudinary.config';
import { Express } from 'express';

@Injectable()
export class UploadService {
  constructor(private readonly prisma: PrismaService) {}

  /* ========================================================================== */
  /* UTILS */
  /* ========================================================================== */

  private extractCloudinaryData(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Fichier manquant');
    }

    const imageUrl = file?.path;
    const publicId = file?.filename;

    if (!imageUrl || !publicId) {
      throw new BadRequestException(
        'Upload Cloudinary invalide (path ou filename manquant)',
      );
    }

    return { imageUrl, publicId };
  }

  private async safeDestroy(publicId: string) {
    try {
      await cloudinary.uploader.destroy(publicId, {
        invalidate: true,
      });
    } catch (error) {
      // On log mais on ne casse pas la requête
      console.error('Erreur suppression Cloudinary:', error);
    }
  }

  private generateSignedUrl(publicId: string): string {
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

  /* ========================================================================== */
  /* SAVE PLAYER IMAGE */
  /* ========================================================================== */

  async savePlayerImage(playerId: number, file: Express.Multer.File) {
    const { imageUrl, publicId } = this.extractCloudinaryData(file);

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException('Joueur introuvable');
    }

    if (player.cloudinaryPublicId) {
      await this.safeDestroy(player.cloudinaryPublicId);
    }

    return this.prisma.player.update({
      where: { id: playerId },
      data: {
        imageUrl,
        cloudinaryPublicId: publicId,
      },
    });
  }

  /* ========================================================================== */
  /* SAVE TEAM LOGO */
  /* ========================================================================== */

  async saveTeamLogo(teamId: number, file: Express.Multer.File) {
    const { imageUrl: logoUrl, publicId } = this.extractCloudinaryData(file);

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Équipe introuvable');
    }

    if (team.cloudinaryLogoId) {
      await this.safeDestroy(team.cloudinaryLogoId);
    }

    return this.prisma.team.update({
      where: { id: teamId },
      data: {
        logoUrl,
        cloudinaryLogoId: publicId,
      },
    });
  }

  /* ========================================================================== */
  /* GET PLAYER SIGNED IMAGE */
  /* ========================================================================== */

  async getPlayerSignedImage(playerId: number) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { cloudinaryPublicId: true },
    });

    if (!player?.cloudinaryPublicId) {
      throw new NotFoundException('Image introuvable');
    }

    return {
      url: this.generateSignedUrl(player.cloudinaryPublicId),
    };
  }

  /* ========================================================================== */
  /* GET TEAM SIGNED LOGO */
  /* ========================================================================== */

  async getTeamSignedLogo(teamId: number) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { cloudinaryLogoId: true },
    });

    if (!team?.cloudinaryLogoId) {
      throw new NotFoundException('Logo introuvable');
    }

    return {
      url: this.generateSignedUrl(team.cloudinaryLogoId),
    };
  }
}
