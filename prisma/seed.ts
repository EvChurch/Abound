import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const auth0Subject = process.env.SEED_ADMIN_AUTH0_SUBJECT;
  const email = process.env.SEED_ADMIN_EMAIL;

  if (!auth0Subject) {
    console.log("Skipping admin seed: SEED_ADMIN_AUTH0_SUBJECT is not set.");
    return;
  }

  await prisma.appUser.upsert({
    where: { auth0Subject },
    create: {
      auth0Subject,
      email: email ?? null,
      role: "ADMIN",
    },
    update: {
      email: email ?? null,
      role: "ADMIN",
      active: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
