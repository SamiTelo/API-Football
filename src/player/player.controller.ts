import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { ParseIntPipe, Param } from '@nestjs/common';
import { PlayerService } from './player.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Player } from '@prisma/client/edge';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('player')
export class PlayerController {
  constructor(private readonly playerservice: PlayerService) {}

  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl sur ThrottlerMethodOrControllerOptions
  @Throttle({ limit: 5, ttl: 10 }) // 5 requêtes / 10 seconde
  @Get('/all')
  getAllplayer(): Promise<Player[]> {
    return this.playerservice.getAllplayer();
  }

  @Get('/:id')
  getOnePlayer(@Param('id', ParseIntPipe) id: number): Promise<Player> {
    return this.playerservice.getOnePlayer(id);
  }

  @Get('/all/position/:positionId')
  getAllPlayerByPosition(
    @Param('positionId', ParseIntPipe) positionId: number,
  ): Promise<Player[]> {
    return this.playerservice.getAllPlayerByPosition(positionId);
  }

  @Get('/all/team/:teamId')
  getAllPlayerByteam(
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<Player[]> {
    return this.playerservice.getAllPlayerByteam(teamId);
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('CREATE_PLAYER')
  @Post()
  createPlayer(@Body() data: CreatePlayerDto): Promise<Player> {
    return this.playerservice.createPlayer(data);
  }

  @Patch('/:id')
  upadtePlayer(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdatePlayerDto,
  ): Promise<Player> {
    return this.playerservice.upadtePlayer(id, data);
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN')
  @Permissions('DELETE_PLAYER')
  @Delete('/:id')
  deletePlayer(@Param('id', ParseIntPipe) id: number): Promise<Player> {
    return this.playerservice.deletePlayer(id);
  }
}
