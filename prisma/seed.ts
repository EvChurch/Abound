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

  const existingUser = await prisma.appUser.findUnique({
    where: { auth0Subject },
  });

  if (!existingUser) {
    await prisma.appUser.create({
      data: {
        auth0Subject,
        email: email ?? null,
        role: "ADMIN",
      },
    });
    return;
  }

  if (!existingUser.active || existingUser.role !== "ADMIN") {
    throw new Error(
      "Refusing to re-enable or promote an existing seed admin user. Update the user explicitly in Postgres.",
    );
  }

  if (email) {
    await prisma.appUser.update({
      where: { auth0Subject },
      data: { email },
    });
  }
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
