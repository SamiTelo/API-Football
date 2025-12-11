import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    'CREATE_PLAYER',
    'EDIT_PLAYER',
    'DELETE_PLAYER',
    'MANAGE_TEAM',
    'CREATE_USER',
    'EDIT_USER',
    'DELETE_USER',
  ];

  // 🔹 Créer les permissions si elles n'existent pas
  for (const name of permissions) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 🔹 Role USER (aucune permission par défaut)
  await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      permissions: { connect: [] },
    },
  });

  // 🔹 Role ADMIN (permissions sur les joueurs et teams)
  const adminPermissions = permissions.filter((p) =>
    ['CREATE_PLAYER', 'EDIT_PLAYER', 'MANAGE_TEAM'].includes(p),
  );

  await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      permissions: { connect: adminPermissions.map((p) => ({ name: p })) },
    },
  });

  // 🔹 Role SUPERADMIN (toutes les permissions)
  await prisma.role.upsert({
    where: { name: 'SUPERADMIN' },
    update: {},
    create: {
      name: 'SUPERADMIN',
      permissions: { connect: permissions.map((p) => ({ name: p })) },
    },
  });

  console.log('✅ Seed terminé : rôles et permissions créés avec succès.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
