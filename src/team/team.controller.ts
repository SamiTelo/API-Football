import {
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { Team } from '@prisma/client';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdapteTeamDto } from './dto/update-team.dto';
import { GetTeamsQueryDto } from './dto/get-teams-query.dto';
import { ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtUser } from 'src/auth/types/jwt-payload.type';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  //------------------------------------------------------
  // GET ALL (clean + scalable)
  //------------------------------------------------------
  @ApiOperation({
    summary: 'Afficher toutes les équipes avec recherche et pagination',
  })
  @Get()
  async getAllTeams(
    @CurrentUser() user: JwtUser,
    @Query() query: GetTeamsQueryDto,
  ) {
    return this.teamService.getAllTeams({
      userId: user.id,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  //------------------------------------------------------
  // GET ONE
  //------------------------------------------------------
  @ApiOperation({ summary: 'Afficher une équipe par ID' })
  @Get('/:id')
  async getOneTeam(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Team> {
    return this.teamService.getOneTeam(id, user.id);
  }

  //------------------------------------------------------
  // CREATE
  //------------------------------------------------------
  @ApiOperation({ summary: 'Créer une nouvelle équipe' })
  @Post()
  async createTeam(
    @CurrentUser() user: JwtUser,
    @Body() data: CreateTeamDto,
  ): Promise<Team> {
    return this.teamService.createTeam(data, user.id);
  }

  //------------------------------------------------------
  // UPDATE
  //------------------------------------------------------
  @ApiOperation({ summary: 'Mettre à jour une équipe existante' })
  @Patch('/:id')
  async updateTeam(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdapteTeamDto,
  ): Promise<Team> {
    return this.teamService.updateTeam(id, data, user.id);
  }

  //------------------------------------------------------
  // DELETE
  //------------------------------------------------------
  @ApiOperation({ summary: 'Supprimer une équipe' })
  @Delete('/:id')
  async deleteTeam(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number }> {
    return this.teamService.deleteTeam(id, user.id);
  }
}
