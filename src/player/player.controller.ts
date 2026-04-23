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
import { PlayerService } from './player.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/types/jwt-payload.type';
import { Player } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { GetPlayersQueryDto } from './dto/get-player-query.dto';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  //------------------------------------------------------
  // GET ALL
  //------------------------------------------------------
  @ApiOperation({
    summary: 'Afficher tous les joueurs avec recherche et pagination',
  })
  @Get()
  async getAllPlayers(
    @CurrentUser() user: JwtUser,
    @Query() query: GetPlayersQueryDto,
  ) {
    return this.playerService.getAllPlayers({
      userId: user.sub,
      search: query.search,
      teamId: query.teamId,
      positionId: query.positionId,
      page: query.page,
      limit: query.limit,
    });
  }

  //------------------------------------------------------
  // GET ONE
  //------------------------------------------------------
  @ApiOperation({ summary: 'Afficher un joueur par ID' })
  @Get('/:id')
  async getOnePlayer(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Player> {
    return this.playerService.getOnePlayer(id, user.sub);
  }

  //------------------------------------------------------
  // CREATE
  //------------------------------------------------------
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl
  @Throttle({ limit: 10, ttl: 60 })
  @ApiOperation({ summary: 'Créer un nouveau joueur' })
  @Post()
  async createPlayer(
    @CurrentUser() user: JwtUser,
    @Body() data: CreatePlayerDto,
  ): Promise<Player> {
    return this.playerService.createPlayer(data, user.sub);
  }

  //------------------------------------------------------
  // UPDATE
  //------------------------------------------------------
  @ApiOperation({ summary: 'Mettre à jour un joueur' })
  @Patch('/:id')
  async updatePlayer(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdatePlayerDto,
  ): Promise<Player> {
    return this.playerService.updatePlayer(id, data, user.sub);
  }

  //------------------------------------------------------
  // DELETE
  //------------------------------------------------------
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl
  @Throttle({ limit: 10, ttl: 60 })
  @ApiOperation({ summary: 'Supprimer un joueur' })
  @Delete('/:id')
  async deletePlayer(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number }> {
    return this.playerService.deletePlayer(id, user.sub);
  }
}
