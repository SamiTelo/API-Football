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
