import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  ParseIntPipe,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlayerService, GetAllPlayersParams } from './player.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Player } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';

@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  //-----------------------------------------------------------
  // GET /player?search=&teamId=&positionId=&page=&limit=
  // Récupérer tous les joueurs avec filtres, recherche et pagination
  //-----------------------------------------------------------
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl
  @Throttle({ limit: 5, ttl: 10 }) // 5 requêtes / 10 secondes
  @ApiOperation({
    summary: 'Afficher tous les joueurs avec recherche et pagination',
  })
  @Get()
  async getAllPlayers(
    @Query('search') search?: string,
    @Query('teamId') teamId?: string,
    @Query('positionId') positionId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: Player[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const userId = 1; // TODO: remplacer par l'ID du user connecté via AuthGuard/JWT
    const params: GetAllPlayersParams = {
      userId,
      search,
      teamId: teamId ? parseInt(teamId, 10) : undefined,
      positionId: positionId ? parseInt(positionId, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    return this.playerService.getAllPlayers(params);
  }

  //-----------------------------------------------------------
  // GET /player/:id
  // Récupérer un joueur par ID
  //-----------------------------------------------------------
  @ApiOperation({ summary: 'Afficher un joueur par ID' })
  @Get('/:id')
  async getOnePlayer(@Param('id', ParseIntPipe) id: number): Promise<Player> {
    const userId = 1; // TODO: remplacer par l'ID du user connecté
    return this.playerService.getOnePlayer(id, userId);
  }

  //-----------------------------------------------------------
  // POST /player
  // Créer un joueur
  //-----------------------------------------------------------
  @ApiOperation({ summary: 'Créer un nouveau joueur' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('CREATE_PLAYER')
  @Post()
  async createPlayer(@Body() data: CreatePlayerDto): Promise<Player> {
    const userId = 1; // TODO: remplacer par l'ID du user connecté
    return this.playerService.createPlayer(data, userId);
  }

  //-----------------------------------------------------------
  // PATCH /player/:id
  // Mettre à jour un joueur
  //-----------------------------------------------------------
  @ApiOperation({ summary: 'Mettre à jour un joueur' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('UPDATE_PLAYER')
  @Patch('/:id')
  async updatePlayer(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdatePlayerDto,
  ): Promise<Player> {
    const userId = 1; // TODO: remplacer par l'ID du user connecté
    return this.playerService.updatePlayer(id, data, userId);
  }

  //-----------------------------------------------------------
  // DELETE /player/:id
  // Supprimer un joueur
  //-----------------------------------------------------------
  @ApiOperation({ summary: 'Supprimer un joueur' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('DELETE_PLAYER')
  @Delete('/:id')
  async deletePlayer(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number }> {
    const userId = 1; // TODO: remplacer par l'ID du user connecté
    return this.playerService.deletePlayer(id, userId);
  }
}
