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
import { PositionService, GetAllPositionsParams } from './position.service';
import { Position } from '@prisma/client';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('position')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  //------------------------------------------------------
  // GET /position?search=&page=&limit=
  // Récupérer toutes les positions avec pagination et recherche
  //------------------------------------------------------
  @ApiOperation({
    summary: 'Afficher toutes les positions avec recherche et pagination',
  })
  @Get()
  async getAllPositions(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: Position[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const userId = 1; // TODO : remplacer par l'ID du user connecté (ex: via AuthGuard)
    const params: GetAllPositionsParams = {
      userId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.positionService.getAllPositions(params);
  }

  //------------------------------------------------------
  // GET /position/:id
  // Récupérer une position par ID (sécurisé)
  //------------------------------------------------------
  @ApiOperation({ summary: 'Afficher une position par ID' })
  @Get('/:id')
  async getOnePosition(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Position> {
    const userId = 1; // TODO : remplacer par l'ID du user connecté
    return this.positionService.getOnePosition(id, userId);
  }

  //------------------------------------------------------
  // POST /position
  // Créer une nouvelle position
  //------------------------------------------------------
  @ApiOperation({ summary: 'Créer une nouvelle position' })
  @Post()
  async createPosition(@Body() data: CreatePositionDto): Promise<Position> {
    const userId = 1; // TODO : remplacer par l'ID du user connecté
    return this.positionService.createPosition(data, userId);
  }

  //------------------------------------------------------
  // PATCH /position/:id
  // Mettre à jour une position existante
  //------------------------------------------------------
  @ApiOperation({ summary: 'Mettre à jour une position existante' })
  @Patch('/:id')
  async updatePosition(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdatePositionDto,
  ): Promise<Position> {
    const userId = 1; // TODO : remplacer par l'ID du user connecté
    return this.positionService.updatePosition(id, data, userId);
  }

  //------------------------------------------------------
  // DELETE /position/:id
  // Supprimer une position (retourne juste l'id)
  //------------------------------------------------------
  @ApiOperation({ summary: 'Supprimer une position' })
  @Delete('/:id')
  async deletePosition(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number }> {
    const userId = 1; // TODO : remplacer par l'ID du user connecté
    return this.positionService.deletePosition(id, userId);
  }
}
