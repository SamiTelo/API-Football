import { Injectable, NotFoundException } from '@nestjs/common';
import { Player } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';

@Injectable()
export class PlayerService {
  constructor(private readonly prisma: PrismaService) {}

  //-----------------------------------------------------------
  //  recupere tout les joueurs
  //-------------------------------------------------------------
  async getAllplayer(page = 1, limit = 10): Promise<Player[]> {
    // pagination affiche les 10 premier joueur
    return this.prisma.player.findMany({
      skip: (page - 1) * limit,
      take: limit,
      //filtrage
      orderBy: {
        firstName: 'asc', // Tri alphabétique
      },
    });
  }

  //-------------------------------------------------------------------------------
  //  recupere un joueur par l'id
  //-------------------------------------------------------------------------
  async getOnePlayer(id: number): Promise<Player> {
    // Recherche le joueur dans la base
    const player = await this.prisma.player.findUnique({
      where: { id },
    });

    // Si aucun joueur trouvée → erreur
    if (!player) {
      throw new NotFoundException(`Aucune joueur trouvée avec l'ID ${id}`);
    }

    // Retourne le joueur trouvée
    return player;
  }

  //---------------------------------------------------------------------------
  //  recupere tout les joueur par post (postionId)
  //------------------------------------------------------------------------------
  async getAllPlayerByPosition(positionId: number): Promise<Player[]> {
    // Recherche tous les joueurs ayant cette position
    const players = await this.prisma.player.findMany({
      where: { positionId },
    });

    // Si aucun joueur trouvé, renvoie une exception 404
    if (!players || players.length === 0) {
      throw new NotFoundException(
        `Aucun joueur trouvé pour la position avec l'ID ${positionId}`,
      );
    }

    // Retourne la liste des joueurs
    return players;
  }

  //------------------------------------------------------------------------
  //  recupere tout les joueur par equipe (teamId)
  //------------------------------------------------------------------------
  async getAllPlayerByteam(teamId: number): Promise<Player[]> {
    // Recherche tous les joueurs appartenant a cette equipe
    const players = await this.prisma.player.findMany({
      where: { teamId },
    });

    if (!players || players.length == 0) {
      throw new NotFoundException(
        `Aucun joueur trouvé pour l'equpie avec l'ID ${teamId}`,
      );
    }

    return players;
  }

  //---------------------------------------------------------------------------
  //  creer un nouveau joueur
  //-------------------------------------------------------------------------
  async createPlayer(data: CreatePlayerDto): Promise<Player> {
    return this.prisma.player.create({
      data,
    });
  }

  //------------------------------------------------------------------------------
  //   mettre a jour un joueur
  //------------------------------------------------------------------------------
  async upadtePlayer(id: number, data: UpdatePlayerDto): Promise<Player> {
    //  verifie si un joueur existe avec cet id
    await this.getOnePlayer(id);

    return this.prisma.player.update({
      where: { id },
      data,
    });
  }

  //---------------------------------------------------------------------------
  // suprimer un joueur
  //--------------------------------------------------------------------
  async deletePlayer(id: number): Promise<Player> {
    // verifie si un joueur existe avant de supprimer
    await this.getOnePlayer(id);

    return this.prisma.player.delete({
      where: { id },
    });
  }
}
