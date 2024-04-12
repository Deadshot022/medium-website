import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  },
  Variables: {
    userId: string;
  }
}>();

blogRouter.use("/*", async (c, next) => {
  const authHeader = c.req.header("authorization") || "";
  console.log('Authorization Header:', authHeader);

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    const token = parts[1];
    console.log('Token:', token);
    console.log('Secret:', c.env.JWT_SECRET);

    try {
      const user = await verify(token, c.env.JWT_SECRET);
      console.log('User object:', user);
      if (user) {
        c.set("userId", user.id);
        await next();
      } else {
        console.log('User ID is not set', user);
        c.status(403);
        return c.json({
          message: "You are not logged in",
        });
      }
    } catch (error) {
      console.error('JWT verification failed:', error);
      c.status(403);
      return c.json({
        message: "You are not logged in",
      });
    }
  } else {
    console.log('Authorization header is not in the correct format');
    c.status(403);
    return c.json({
      message: "You are not logged in",
    });
  }
});

blogRouter.post("/", async (c) => {
  const body = await c.req.json();
  console.log('Body:', body);
  const authorId = c.get("userId");
  console.log('Author ID:', authorId);
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const blog = await prisma.post.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: Number(authorId),
    },
  });

  return c.json({
    id: blog.id,
  });
});

blogRouter.put("/", async (c) => {
  const body = await c.req.json();
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.post.update({
    where: {
      id: body.id,
    },
    data: {
      title: body.title,
      content: body.content,
    },
  });

  return c.json({
    id: blog.id,
  });
});

blogRouter.get("/", async (c) => {
  const body = await c.req.json();
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blog = await prisma.post.findFirst({
      where: {
        id: body.id,
      },
    });
    return c.json({
      blog,
    });
  } catch (e) {
    c.status(411);
    return c.json({
      message: "Error while fetching blog post",
    });
  }
});

//Pagination
blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const blog = await prisma.post.findMany();

  return c.json({
    blog,
  });
});
