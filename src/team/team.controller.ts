import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { ParseIntPipe, Param } from '@nestjs/common';
import { TeamService } from './team.service';
import { Team } from '@prisma/client';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdapteTeamDto } from './dto/update-team.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('all')
  @ApiOperation({ summary: 'Afficher toute les equipes' })
  @ApiResponse({ status: 200, description: 'Opération réussir' })
  @ApiResponse({ status: 404, description: 'Aucune equipe trouvé' })
  getAllTeam(): Promise<Team[]> {
    return this.teamService.getAllTeam();
  }

  @Get('/:id')
  @ApiOperation({ summary: "Afficher une equipe par son l'id" })
  @ApiResponse({ status: 200, description: 'Opération réussir' })
  @ApiResponse({ status: 404, description: 'Équipe non trouvée' })
  getOneTeam(@Param('id', ParseIntPipe) id: number): Promise<Team> {
    return this.teamService.getOneTeam(id);
  }

  @Post()
  @ApiOperation({ summary: "Création d'une nouvelle equipe" })
  @ApiResponse({ status: 200, description: 'Equipe créer avec succès' })
  @ApiResponse({ status: 404, description: "Création de l'equipe echoué" })
  createTeam(@Body() data: CreateTeamDto): Promise<Team> {
    return this.teamService.createTeam(data);
  }

  @Patch('/:id')
  @ApiOperation({ summary: 'Mettre à jour une équipe' })
  @ApiResponse({ status: 200, description: 'Équipe mise à jour' })
  @ApiResponse({ status: 404, description: 'Équipe non trouvée' })
  updateTeam(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdapteTeamDto,
  ): Promise<Team> {
    return this.teamService.updateTeam(id, data);
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Supprimer une equipe' })
  @ApiResponse({ status: 200, description: 'Equipe supprimer avec succès' })
  @ApiResponse({ status: 404, description: 'Équipe non trouvée' })
  deleteTeam(@Param('id', ParseIntPipe) id: number): Promise<Team> {
    return this.teamService.deleteTeam(id);
  }
}
