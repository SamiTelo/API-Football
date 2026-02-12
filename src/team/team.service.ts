import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Team } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdapteTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  //------------------------------------------------------------
  // Afficher tout les team
  //------------------------------------------------------------
  async getAllTeam(): Promise<Team[]> {
    return this.prisma.team.findMany({});
  }

  /**--------------------------------------------------------------------
   * Récupère une team à partir de son ID.
   * Lance une erreur 404 si aucune position n'est trouvée.
   -------------------------------------------------------------------------------*/
  async getOneTeam(id: number): Promise<Team> {
    // récupère l'id
    const team = await this.prisma.team.findUnique({
      where: { id },
    });
    //verifie que une team existe
    if (!team) {
      throw new NotFoundException(`aucune team existe pour cet Id ${id}`);
    }
    return team;
  }

  //---------------------------------------------------------------
  // Créer une nouvelle équipe
  //------------------------------------------------------------------
  async createTeam(data: CreateTeamDto): Promise<Team> {
    // Vérifie si une équipe possède déjà ce nom
    const teamExist = await this.prisma.team.findFirst({
      where: { name: data.name },
    });

    if (teamExist) {
      throw new BadRequestException(
        `Une équipe existe déjà avec ce nom, veuillez en choisir un autre.`,
      );
    }

    // Création de la nouvelle équipe
    return this.prisma.team.create({
      data,
    });
  }

  //--------------------------------------------------------------------------
  // Mettre à jour une équipe
  //---------------------------------------------------------------------------
  async updateTeam(id: number, data: UpdapteTeamDto): Promise<Team> {
    // Vérifie si l'équipe existe
    await this.getOneTeam(id);

    // Mise à jour de l'équipe
    return this.prisma.team.update({
      where: { id },
      data,
    });
  }

  //---------------------------------------------------------------
  // supprimer une team par son ID
  //-------------------------------------------------------------
  async deleteTeam(id: number): Promise<Team> {
    //verifie si une equipe existe deja avec cet ID
    await this.getOneTeam(id);

    return this.prisma.team.delete({
      where: { id },
    });
  }
}
