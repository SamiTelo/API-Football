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
import { PositionService } from './position.service';
import { Position } from '@prisma/client';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { GetPositionsQueryDto } from './dto/get-positions-query.dto';
import { ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtUser } from 'src/auth/types/jwt-payload.type';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('position')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  //------------------------------------------------------
  // GET ALL (clean + scalable)
  //------------------------------------------------------
  @ApiOperation({
    summary: 'Afficher toutes les positions avec recherche et pagination',
  })
  @Get()
  async getAllPositions(
    @CurrentUser() user: JwtUser,
    @Query() query: GetPositionsQueryDto,
  ) {
    return this.positionService.getAllPositions({
      userId: user.id,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  //------------------------------------------------------
  // GET ONE
  //------------------------------------------------------
  @ApiOperation({ summary: 'Afficher une position par ID' })
  @Get('/:id')
  async getOnePosition(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Position> {
    return this.positionService.getOnePosition(id, user.id);
  }

  //------------------------------------------------------
  // CREATE
  //------------------------------------------------------
  @ApiOperation({ summary: 'Créer une nouvelle position' })
  @Post()
  async createPosition(
    @CurrentUser() user: JwtUser,
    @Body() data: CreatePositionDto,
  ): Promise<Position> {
    return this.positionService.createPosition(data, user.id);
  }

  //------------------------------------------------------
  // UPDATE
  //------------------------------------------------------
  @ApiOperation({ summary: 'Mettre à jour une position existante' })
  @Patch('/:id')
  async updatePosition(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdatePositionDto,
  ): Promise<Position> {
    return this.positionService.updatePosition(id, data, user.id);
  }

  //------------------------------------------------------
  // DELETE
  //------------------------------------------------------
  @ApiOperation({ summary: 'Supprimer une position' })
  @Delete('/:id')
  async deletePosition(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number }> {
    return this.positionService.deletePosition(id, user.id);
  }
}
