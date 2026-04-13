import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Team } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

export interface GetAllTeamsParams {
  userId: number;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  //------------------------------------------------------
  // GET all teams avec recherche et pagination
  //------------------------------------------------------
  async getAllTeams(params: GetAllTeamsParams): Promise<{
    data: Team[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { userId, search, page = 1, limit = 10 } = params;

    const where: Prisma.TeamWhereInput = {
      userId,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    const total = await this.prisma.team.count({ where });

    const data = await this.prisma.team.findMany({
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
  // GET one team par ID
  //------------------------------------------------------
  async getOneTeam(id: number, userId: number): Promise<Team> {
    const team = await this.prisma.team.findFirst({
      where: { id, userId },
    });

    if (!team) {
      throw new NotFoundException(`Aucune équipe trouvée avec l'ID ${id}`);
    }

    return team;
  }

  //------------------------------------------------------
  // POST create team (DEBUG VERSION)
  //------------------------------------------------------
  async createTeam(data: CreateTeamDto, userId: number): Promise<Team> {
    console.log('====================================');
    console.log('CREATE TEAM START');
    console.log('DTO DATA:', JSON.stringify(data, null, 2));
    console.log('USER ID:', userId);
    console.log('DATABASE_URL:', !!process.env.DATABASE_URL);
    console.log('====================================');

    try {
      console.log('Step 1: checking existing team...');

      const existing = await this.prisma.team.findFirst({
        where: {
          name: data.name,
          userId,
        },
      });

      console.log('Existing team:', existing);

      if (existing) {
        console.warn('Duplicate team detected');
        throw new BadRequestException(
          'Une équipe avec ce nom existe déjà pour votre compte.',
        );
      }

      console.log('Step 2: creating team...');

      const team = await this.prisma.team.create({
        data: {
          name: data.name,
          country: data.country ?? null,
          userId,
        },
      });

      console.log('TEAM CREATED SUCCESSFULLY:');
      console.log(team);
      console.log('CREATE TEAM END');

      return team;
    } catch (error: unknown) {
      console.error('====================================');
      console.error('CREATE TEAM ERROR');

      if (error instanceof Error) {
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
      } else {
        console.error('Non-Error object:', error);
      }

      console.error('Full error:', error);
      console.error('====================================');

      throw error;
    }
  }

  //------------------------------------------------------
  // PATCH update team (sécurisé par userId)
  //------------------------------------------------------
  async updateTeam(
    id: number,
    data: UpdateTeamDto,
    userId: number,
  ): Promise<Team> {
    // Update avec condition sur id + userId
    const updated = await this.prisma.team.updateMany({
      where: { id, userId },
      data,
    });

    // Si aucune ligne affectée → NotFound
    if (updated.count === 0) {
      throw new NotFoundException(
        `Impossible de mettre à jour : aucune équipe trouvée avec l'ID ${id} pour cet utilisateur.`,
      );
    }

    // Retourner la team mise à jour
    return this.getOneTeam(id, userId);
  }

  //------------------------------------------------------
  // DELETE sécurisé pour Team
  //------------------------------------------------------
  async deleteTeam(id: number, userId: number): Promise<{ id: number }> {
    const deleted = await this.prisma.team.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(
        `Impossible de supprimer : aucune équipe trouvée avec l'ID ${id} pour cet utilisateur.`,
      );
    }

    return { id }; // simple et clair
  }
}
