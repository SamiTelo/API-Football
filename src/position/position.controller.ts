import { Controller, Delete, Get, Post, Patch } from '@nestjs/common';
import { Body, Param, ParseIntPipe } from '@nestjs/common';
import { PositionService } from './position.service';
import { Position } from '@prisma/client';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

/**
 * Controller responsable de gérer toutes les routes liées aux Positions.
 * Le prefixe 'position' sera ajouté à toutes les routes définies ici.
 */
@Controller('position')
export class PositionController {
  /**
   * Injection du PositionService.
   * Cela permet d’accéder aux méthodes (CRUD) liées aux Positions.
   */
  constructor(private readonly positionService: PositionService) {}

  /**
   * GET /position/all
   * Récupère la liste complète des positions.
   */
  @Get('/all')
  getAllPositions(): Promise<Position[]> {
    return this.positionService.getAllPositions();
  }

  /**
   * GET /position/:id
   * Récupère une position par son ID.
   * @param id - identifiant numérique validé par ParseIntPipe
   */
  @Get('/:id')
  getOnePosition(@Param('id', ParseIntPipe) id: number): Promise<Position> {
    return this.positionService.getOnePosition(id);
  }

  /**
   * POST /position
   * Crée une nouvelle position.
   * @Body() data - validé par CreatePositionDto (class-validator)
   * @returns Promise<Position>
   */
  @Post()
  createPosition(@Body() data: CreatePositionDto): Promise<Position> {
    return this.positionService.createPosition(data);
  }

  /**
   * DELETE /position/:id
   * Supprime une position par son ID.
   * @param id - identifiant numérique validé par ParseIntPipe
   * @returns Promise<Position>
   */
  @Delete('/:id')
  deletePosition(@Param('id', ParseIntPipe) id: number): Promise<Position> {
    return this.positionService.deletePosition(id);
  }

  /**
   * PATCH /position/:id
   * Met à jour une position existante.
   * PATCH est utilisé car cela représente une mise à jour partielle.
   * @param id - identifiant numérique
   * @Body() data - validé par UpdatePositionDto
   * @returns Promise<Position>
   */
  @Patch('/:id')
  updatePosition(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdatePositionDto,
  ): Promise<Position> {
    return this.positionService.updatePosition(id, data);
  }
}
