/* eslint-disable @typescript-eslint/unbound-method */

jest.mock('src/config/cloudinary.config', () => ({
  uploader: {
    destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
  },
  url: jest.fn((publicId: string) => `https://cloudinary.com/${publicId}`),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UploadService } from './upload.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import cloudinary from 'src/config/cloudinary.config';

describe('UploadService', () => {
  let service: UploadService;
  let prisma: PrismaService;

  const mockFile = {
    path: 'http://image.url/image.jpg',
    filename: 'image123',
  } as Express.Multer.File;

  const mockPlayer = {
    id: 1,
    cloudinaryPublicId: 'oldPlayerId',
  };

  const mockTeam = {
    id: 1,
    cloudinaryLogoId: 'oldTeamId',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: PrismaService,
          useValue: {
            player: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            team: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* ============================================================= */
  /* savePlayerImage */
  /* ============================================================= */

  it('should save player image and destroy old one if exists', async () => {
    (prisma.player.findUnique as jest.Mock).mockResolvedValue(mockPlayer);
    (prisma.player.update as jest.Mock).mockResolvedValue({
      ...mockPlayer,
      imageUrl: mockFile.path,
      cloudinaryPublicId: mockFile.filename,
    });

    const result = await service.savePlayerImage(1, mockFile);

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('oldPlayerId', {
      invalidate: true,
    });

    expect(prisma.player.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        imageUrl: mockFile.path,
        cloudinaryPublicId: mockFile.filename,
      },
    });

    expect(result.imageUrl).toBe(mockFile.path);
  });

  it('should throw NotFoundException if player not found', async () => {
    (prisma.player.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.savePlayerImage(1, mockFile)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException if file invalid', async () => {
    await expect(
      service.savePlayerImage(1, {} as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
  });

  /* ============================================================= */
  /* saveTeamLogo */
  /* ============================================================= */

  it('should save team logo and destroy old one if exists', async () => {
    (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);
    (prisma.team.update as jest.Mock).mockResolvedValue({
      ...mockTeam,
      logoUrl: mockFile.path,
      cloudinaryLogoId: mockFile.filename,
    });

    const result = await service.saveTeamLogo(1, mockFile);

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('oldTeamId', {
      invalidate: true,
    });

    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        logoUrl: mockFile.path,
        cloudinaryLogoId: mockFile.filename,
      },
    });

    expect(result.logoUrl).toBe(mockFile.path);
  });

  it('should throw NotFoundException if team not found', async () => {
    (prisma.team.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.saveTeamLogo(1, mockFile)).rejects.toThrow(
      NotFoundException,
    );
  });

  /* ============================================================= */
  /* getPlayerSignedImage */
  /* ============================================================= */

  it('should return signed player image URL', async () => {
    (prisma.player.findUnique as jest.Mock).mockResolvedValue({
      cloudinaryPublicId: 'playerId123',
    });

    const result = await service.getPlayerSignedImage(1);

    expect(result.url).toBe('https://cloudinary.com/playerId123');
  });

  it('should throw NotFoundException if player image missing', async () => {
    (prisma.player.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getPlayerSignedImage(1)).rejects.toThrow(
      NotFoundException,
    );
  });

  /* ============================================================= */
  /* getTeamSignedLogo */
  /* ============================================================= */

  it('should return signed team logo URL', async () => {
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      cloudinaryLogoId: 'teamId123',
    });

    const result = await service.getTeamSignedLogo(1);

    expect(result.url).toBe('https://cloudinary.com/teamId123');
  });

  it('should throw NotFoundException if team logo missing', async () => {
    (prisma.team.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getTeamSignedLogo(1)).rejects.toThrow(
      NotFoundException,
    );
  });
});
