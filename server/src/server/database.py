from prisma import Prisma

prisma = Prisma()

async def get_prisma():
    """Dependency to get Prisma client instance."""
    if not prisma.is_connected():
        await prisma.connect()
    return prisma
