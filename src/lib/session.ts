import { auth } from "./auth";
import { prisma } from "./prisma";

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function getActiveUserPlan(userId: string) {
  return prisma.userPlan.findFirst({
    where: { userId, isActive: true },
    include: { healthPlan: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCurrentUserProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      plans: {
        where: { isActive: true },
        include: { healthPlan: true },
        take: 1,
      },
      _count: {
        select: {
          favorites: true,
          confirmations: true,
          verificationRequests: true,
        },
      },
    },
  });

  return user;
}
