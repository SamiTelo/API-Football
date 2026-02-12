import {
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { PositionService } from './position.service';
import { Position } from '@prisma/client';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('position')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  /*--------------------------------------------------------
   * GET /position/all
   * Récupère la liste complète des positions.
   ---------------------------------------------------------------*/
  @ApiOperation({ summary: 'Afficher toute les post' })
  @Get('/all')
  getAllPositions(): Promise<Position[]> {
    return this.positionService.getAllPositions();
  }

  /*-------------------------------------------------------------------------
   * GET /position/:id
   * Récupère une position par son ID.
   ---------------------------------------------------------------------*/
  @ApiOperation({ summary: 'Afficher un post' })
  @Get('/:id')
  getOnePosition(@Param('id', ParseIntPipe) id: number): Promise<Position> {
    return this.positionService.getOnePosition(id);
  }

  /*---------------------------------------------------------------------------
   * POST /position
   * Crée une nouvelle position.
   --------------------------------------------------------------------------------*/
  @ApiOperation({ summary: 'Enregistrer un post' })
  @Post()
  createPosition(@Body() data: CreatePositionDto): Promise<Position> {
    return this.positionService.createPosition(data);
  }

  /*----------------------------------------------------------------------------
   * DELETE /position/:id
   * Supprime une position par son ID.
   ---------------------------------------------------------------------------------*/
  @ApiOperation({ summary: 'Supprimer un post' })
  @Delete('/:id')
  deletePosition(@Param('id', ParseIntPipe) id: number): Promise<Position> {
    return this.positionService.deletePosition(id);
  }

  /*-----------------------------------------------------------------------------
   * PATCH /position/:id
   * Met à jour une position existante.
   * PATCH est utilisé car cela représente une mise à jour partielle.
   --------------------------------------------------------------------------------*/
  @ApiOperation({ summary: 'Mettre à jour un post' })
  @Patch('/:id')
  updatePosition(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdatePositionDto,
  ): Promise<Position> {
    return this.positionService.updatePosition(id, data);
  }
}
