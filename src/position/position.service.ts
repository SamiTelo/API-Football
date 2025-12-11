import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Position } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { CreatePositionDto } from './dto/create-position.dto';
import { BadRequestException } from '@nestjs/common';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionService {
  constructor(private readonly prisma: PrismaService) {}

  // Récupérer toutes les positions
  async getAllPositions(): Promise<Position[]> {
    return this.prisma.position.findMany();
  }

  /**
   * Récupère une position à partir de son ID.
   * Lance une erreur 404 si aucune position n'est trouvée.
   */
  async getOnePosition(id: number): Promise<Position> {
    // Recherche la position dans la base
    const position = await this.prisma.position.findUnique({
      where: { id },
    });

    // Si aucune position trouvée → erreur
    if (!position) {
      throw new NotFoundException(`Aucune position trouvée avec l'ID ${id}`);
    }

    // Retourne la position trouvée
    return position;
  }

  /**
   * Crée une nouvelle position
   * - Vérifie que le nom n'est pas déjà utilisé
   * - Renvoie une erreur si la position existe déjà
   */
  async createPosition(data: CreatePositionDto): Promise<Position> {
    // Vérifie si une position avec le même nom existe déjà
    const existingPosition = await this.prisma.position.findUnique({
      where: { name: data.name },
    });

    if (existingPosition) {
      throw new BadRequestException(
        'Ce poste existe déjà, veuillez choisir un autre',
      );
    }

    // Crée et enregistre la nouvelle position
    return this.prisma.position.create({
      data,
    });
  }

  /**
   * Met à jour une position existante
   * - Vérifie d'abord si la position existe
   * - Si elle existe, applique les modifications
   */
  async updatePosition(id: number, data: UpdatePositionDto): Promise<Position> {
    // Vérifie si la position existe avant la modification
    await this.getOnePosition(id);

    // Mettre à jour la position
    return this.prisma.position.update({
      where: { id },
      data,
    });
  }

  /**
   * Supprime une position existante
   * - Vérifie si la position existe avant suppression
   * - Renvoie une erreur si elle n'existe pas
   */
  async deletePosition(id: number): Promise<Position> {
    // Vérifie si la position existe avant de tenter la suppression
    await this.getOnePosition(id);

    // Exécute la suppression de la position
    return this.prisma.position.delete({
      where: { id },
    });
  }
}
