import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

  //  Créer les permissions si elles n'existent pas
  for (const name of permissions) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  //  Role USER (aucune permission par défaut)
  await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      permissions: { connect: [] },
    },
  });

  //  Role ADMIN (permissions sur les joueurs et teams)
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

  //  Role SUPERADMIN (toutes les permissions)
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPERADMIN' },
    update: {},
    create: {
      name: 'SUPERADMIN',
      permissions: { connect: permissions.map((p) => ({ name: p })) },
    },
  });

  //  Créer le SUPERADMIN si inexistant
  const superAdminEmail =
    process.env.SUPERADMIN_EMAIL || 'samitelo10@gmail.com';
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123';

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (!existingSuperAdmin) {
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

    await prisma.user.create({
      data: {
        firstName: 'Super',
        lastName: 'Admin',
        email: superAdminEmail,
        password: hashedPassword,
        roleId: superAdminRole.id,
        isVerified: true, // verifie admin direct
      },
    });

    console.log(
      `SUPERADMIN créé avec email: ${superAdminEmail} et mot de passe: ${superAdminPassword}`,
    );
  } else {
    console.log('SUPERADMIN existe déjà.');
  }

  console.log(
    'Seed terminé : rôles, permissions et SUPERADMIN créés avec succès.',
  );
}

// Exécute le seed
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
