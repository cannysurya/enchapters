import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find all users
    const users = await prisma.user.findMany();
    console.log('Current users:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));

    if (users.length === 0) {
        console.log('No users found in the database.');
        return;
    }

    // Promote the first user to ADMIN
    const updated = await prisma.user.update({
        where: { id: users[0].id },
        data: { role: 'ADMIN' },
    });

    console.log(`✅ Promoted ${updated.email} to ADMIN role.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
