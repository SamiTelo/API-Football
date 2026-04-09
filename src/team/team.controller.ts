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
} from '@nestjs/common';
import { TeamService, GetAllTeamsParams } from './team.service';
import { Team } from '@prisma/client';
import { CreateTeamDto } from './dto/create-team.dto';
import { ApiOperation } from '@nestjs/swagger';
import { UpdapteTeamDto } from './dto/update-team.dto';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  //------------------------------------------------------
  // GET /team?search=&page=&limit=
  // Récupérer toutes les équipes avec pagination et recherche
  //------------------------------------------------------
  @ApiOperation({
    summary: 'Afficher toutes les équipes avec recherche et pagination',
  })
  @Get()
  async getAllTeams(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: Team[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const userId = 1; // TODO : remplacer par l'ID du user connecté
    const params: GetAllTeamsParams = {
      userId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.teamService.getAllTeams(params);
  }

  //------------------------------------------------------
  // GET /team/:id
  // Récupérer une équipe par ID (sécurisé)
  //------------------------------------------------------
  @ApiOperation({ summary: 'Afficher une équipe par ID' })
  @Get('/:id')
  async getOneTeam(@Param('id', ParseIntPipe) id: number): Promise<Team> {
    const userId = 1; // TODO : remplacer par l'ID du user connecté
    return this.teamService.getOneTeam(id, userId);
  }

  //------------------------------------------------------
  // POST /team
  // Créer une nouvelle équipe
  //------------------------------------------------------
  @ApiOperation({ summary: 'Créer une nouvelle équipe' })
  @Post()
  async createTeam(@Body() data: CreateTeamDto): Promise<Team> {
    const userId = 1; // TODO : remplacer par l'ID du user connecté
    return this.teamService.createTeam(data, userId);
  }

  //------------------------------------------------------
  // PATCH /team/:id
  // Mettre à jour une équipe existante
  //------------------------------------------------------
  @ApiOperation({ summary: 'Mettre à jour une équipe existante' })
  @Patch('/:id')
  async updateTeam(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdapteTeamDto,
  ): Promise<Team> {
    const userId = 1; // TODO : remplacer par l'ID du user connecté
    return this.teamService.updateTeam(id, data, userId);
  }

  //------------------------------------------------------
  // DELETE /team/:id
  // Supprimer une équipe
  //------------------------------------------------------
  @ApiOperation({ summary: 'Supprimer une équipe' })
  @Delete('/:id')
  async deleteTeam(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number }> {
    const userId = 1; // TODO : remplacer par l'ID du user connecté
    return this.teamService.deleteTeam(id, userId);
  }
}
