import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Player } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';

export interface GetAllPlayersParams {
  userId: number;
  search?: string; // recherche sur firstName / lastName
  teamId?: number; // filtre par équipe
  positionId?: number; // filtre par position
  page?: number;
  limit?: number;
}

@Injectable()
export class PlayerService {
  constructor(private readonly prisma: PrismaService) {}

  //------------------------------------------------------
  // GET all players avec recherche, filtres et pagination
  //------------------------------------------------------
  async getAllPlayers(params: GetAllPlayersParams): Promise<{
    data: Player[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { userId, search, teamId, positionId, page = 1, limit = 10 } = params;

    // clause where typée
    const where: Prisma.PlayerWhereInput = {
      userId,
      ...(teamId && { teamId }),
      ...(positionId && { positionId }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const total = await this.prisma.player.count({ where });

    const data = await this.prisma.player.findMany({
      where,
      orderBy: { firstName: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  //------------------------------------------------------
  // GET one player par ID
  //------------------------------------------------------
  async getOnePlayer(id: number, userId: number): Promise<Player> {
    const player = await this.prisma.player.findFirst({
      where: { id, userId },
    });

    if (!player) {
      throw new NotFoundException(`Aucun joueur trouvé avec l'ID ${id}`);
    }

    return player;
  }

  //------------------------------------------------------
  // POST create player
  //------------------------------------------------------
  async createPlayer(data: CreatePlayerDto, userId: number): Promise<Player> {
    // Vérifie si un joueur avec le même prénom + nom existe pour cet utilisateur
    const existing = await this.prisma.player.findFirst({
      where: {
        firstName: data.firstName,
        lastName: data.lastName,
        userId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Un joueur avec le nom ${data.firstName} ${data.lastName} existe déjà pour votre compte.`,
      );
    }

    return this.prisma.player.create({
      data: { ...data, userId },
    });
  }

  //------------------------------------------------------
  // PATCH update player (sécurisé par userId)
  //------------------------------------------------------
  async updatePlayer(
    id: number,
    data: UpdatePlayerDto,
    userId: number,
  ): Promise<Player> {
    // Mise à jour sécurisée
    const updated = await this.prisma.player.updateMany({
      where: { id, userId },
      data,
    });

    // Si aucune ligne mise à jour → erreur
    if (updated.count === 0) {
      throw new NotFoundException(
        `Impossible de mettre à jour : aucun joueur trouvé avec l'ID ${id} pour cet utilisateur.`,
      );
    }

    // Retourne le joueur mis à jour
    return this.getOnePlayer(id, userId);
  }

  //------------------------------------------------------
  // DELETE sécurisé
  //------------------------------------------------------
  async deletePlayer(id: number, userId: number): Promise<{ id: number }> {
    const deleted = await this.prisma.player.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(
        `Impossible de supprimer : aucun joueur trouvé avec l'ID ${id} pour cet utilisateur.`,
      );
    }

    return { id }; // simple et clair
  }
}
