import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  ParseIntPipe,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PlayerService } from './player.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Player } from '@prisma/client/edge';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('player')
export class PlayerController {
  constructor(private readonly playerservice: PlayerService) {}

  //-----------------------------------------------------------
  //  recupere tout les joueurs
  //-------------------------------------------------------------
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl sur ThrottlerMethodOrControllerOptions
  @Throttle({ limit: 5, ttl: 10 }) // 5 requêtes / 10 seconde
  @ApiOperation({ summary: 'Afficher toute les joueurs' })
  @Get('/all')
  getAllplayer(): Promise<Player[]> {
    return this.playerservice.getAllplayer();
  }

  //-------------------------------------------------------------------------------
  //  recupere un joueur par l'id
  //-------------------------------------------------------------------------
  @ApiOperation({ summary: "Afficher un joueur par son l'id" })
  @Get('/:id')
  getOnePlayer(@Param('id', ParseIntPipe) id: number): Promise<Player> {
    return this.playerservice.getOnePlayer(id);
  }

  //---------------------------------------------------------------------------
  //  recupere tout les joueur par post (postionId)
  //------------------------------------------------------------------------------
  @ApiOperation({ summary: 'Afficher toute les joueurs par post' })
  @Get('/all/position/:positionId')
  getAllPlayerByPosition(
    @Param('positionId', ParseIntPipe) positionId: number,
  ): Promise<Player[]> {
    return this.playerservice.getAllPlayerByPosition(positionId);
  }

  //------------------------------------------------------------------------
  //  recupere tout les joueur par equipe (teamId)
  //------------------------------------------------------------------------
  @ApiOperation({ summary: 'Afficher toute les joueurs par equipe' })
  @Get('/all/team/:teamId')
  getAllPlayerByteam(
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<Player[]> {
    return this.playerservice.getAllPlayerByteam(teamId);
  }

  //---------------------------------------------------------------------------
  //  creer un nouveau joueur
  //-------------------------------------------------------------------------
  @ApiOperation({ summary: 'Enregistrer un joueur' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('CREATE_PLAYER')
  @Post()
  createPlayer(@Body() data: CreatePlayerDto): Promise<Player> {
    return this.playerservice.createPlayer(data);
  }

  //------------------------------------------------------------------------------
  //   mettre à jour un joueur
  //------------------------------------------------------------------------------
  @ApiOperation({ summary: 'Mettre à jours un joueur' })
  @Patch('/:id')
  upadtePlayer(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdatePlayerDto,
  ): Promise<Player> {
    return this.playerservice.upadtePlayer(id, data);
  }

  //---------------------------------------------------------------------------
  // suprimer un joueur
  //--------------------------------------------------------------------
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Supprimer un joueur' })
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN')
  @Permissions('DELETE_PLAYER')
  @Delete('/:id')
  deletePlayer(@Param('id', ParseIntPipe) id: number): Promise<Player> {
    return this.playerservice.deletePlayer(id);
  }
}
