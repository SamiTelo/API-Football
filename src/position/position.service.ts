import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Position, Prisma } from '@prisma/client';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

export interface GetAllPositionsParams {
  userId: number;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PositionService {
  constructor(private readonly prisma: PrismaService) {}

  //------------------------------------------------------
  // GET all positions avec recherche et pagination
  //------------------------------------------------------
  async getAllPositions(params: GetAllPositionsParams): Promise<{
    data: Position[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { userId, search, page = 1, limit = 10 } = params;

    const where: Prisma.PositionWhereInput = {
      userId,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    // total des positions correspondantes
    const total = await this.prisma.position.count({ where });

    // récupération avec pagination
    const data = await this.prisma.position.findMany({
      where,
      orderBy: { id: 'desc' },
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
  // GET position par ID
  //------------------------------------------------------
  async getOnePosition(id: number, userId: number): Promise<Position> {
    const position = await this.prisma.position.findFirst({
      where: { id, userId },
    });

    if (!position) {
      throw new NotFoundException(`Aucune position trouvée avec l'ID ${id}`);
    }

    return position;
  }

  //------------------------------------------------------
  // POST create
  //------------------------------------------------------
  async createPosition(
    data: CreatePositionDto,
    userId: number,
  ): Promise<Position> {
    const existing = await this.prisma.position.findFirst({
      where: { name: data.name, userId },
    });

    if (existing) {
      throw new BadRequestException('Ce poste existe déjà pour votre compte.');
    }

    return this.prisma.position.create({ data: { ...data, userId } });
  }

  //------------------------------------------------------
  // PATCH update sécurisé
  //------------------------------------------------------
  async updatePosition(
    id: number,
    data: UpdatePositionDto,
    userId: number,
  ): Promise<Position> {
    const updated = await this.prisma.position.updateMany({
      where: { id, userId },
      data,
    });

    if (updated.count === 0) {
      throw new NotFoundException(
        `Impossible de mettre à jour : aucune position trouvée avec l'ID ${id} pour cet utilisateur.`,
      );
    }

    // Retourne la position mise à jour
    return this.getOnePosition(id, userId);
  }

  //------------------------------------------------------
  // DELETE sécurisé
  //------------------------------------------------------
  async deletePosition(id: number, userId: number): Promise<{ id: number }> {
    const deleted = await this.prisma.position.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(
        `Impossible de supprimer : aucune position trouvée avec l'ID ${id} pour cet utilisateur.`,
      );
    }

    return { id };
  }
}
