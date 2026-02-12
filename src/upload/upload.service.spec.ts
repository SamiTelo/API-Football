/* eslint-disable @typescript-eslint/unbound-method */

jest.doMock('src/config/cloudinary.config', () => ({
  uploader: {
    destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    upload: jest.fn().mockResolvedValue({
      url: 'http://fakeurl.com/image.jpg',
      public_id: 'fakeId',
    }),
  },
  url: jest.fn((publicId) => `https://cloudinary.com/${publicId}`),
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

  const mockPlayer = { id: 1, cloudinaryPublicId: 'oldPlayerId' };
  const mockTeam = { id: 1, cloudinaryLogoId: 'oldTeamId' };

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

  /* --------------------------------------------------------------------------
   * savePlayerImage
   * -------------------------------------------------------------------------- */
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

    const playerUpdateMock = prisma.player.update as jest.Mock;
    expect(playerUpdateMock).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        imageUrl: mockFile.path,
        cloudinaryPublicId: mockFile.filename,
      },
    });

    expect(result.imageUrl).toBe(mockFile.path);
  });

  /* --------------------------------------------------------------------------
   * saveTeamLogo
   * -------------------------------------------------------------------------- */
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

  /* --------------------------------------------------------------------------
   * getPlayerImagePublicId
   * -------------------------------------------------------------------------- */
  it('should return player publicId', async () => {
    (prisma.player.findUnique as jest.Mock).mockResolvedValue(mockPlayer);
    const result = await service.getPlayerImagePublicId(1);
    expect(result).toBe('oldPlayerId');
  });

  it('should throw NotFoundException if player has no image', async () => {
    (prisma.player.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    await expect(service.getPlayerImagePublicId(1)).rejects.toThrow(
      NotFoundException,
    );
  });

  /* --------------------------------------------------------------------------
   * getTeamLogoPublicId
   * -------------------------------------------------------------------------- */
  it('should return team logoId', async () => {
    (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);
    const result = await service.getTeamLogoPublicId(1);
    expect(result).toBe('oldTeamId');
  });

  it('should throw NotFoundException if team has no logo', async () => {
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    await expect(service.getTeamLogoPublicId(1)).rejects.toThrow(
      NotFoundException,
    );
  });

  /* --------------------------------------------------------------------------
   * getSignedImage
   * -------------------------------------------------------------------------- */
  it('should return signed URL', () => {
    const url = service.getSignedImage('someId');
    expect(url).toBe('https://cloudinary.com/someId');
  });

  it('should throw BadRequestException if publicId missing', () => {
    expect(() => service.getSignedImage('')).toThrow(BadRequestException);
  });
});
