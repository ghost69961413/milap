import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import env from "./env.js";

let inMemoryMongoServer = null;

async function connectWithUri(uri) {
  await mongoose.connect(uri, {
    dbName: env.mongoDbName
  });
}

async function startInMemoryMongo() {
  inMemoryMongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: env.mongoDbName,
      ip: "127.0.0.1",
      port: Number(process.env.MONGO_MEMORY_PORT || 27018)
    }
  });
  const inMemoryUri = inMemoryMongoServer.getUri();
  await connectWithUri(inMemoryUri);
  console.info(`Connected to in-memory MongoDB (${env.mongoDbName})`);
}

export async function connectDatabase() {
  if (env.mongoUri) {
    try {
      await connectWithUri(env.mongoUri);
      return;
    } catch (error) {
      if (!env.useInMemoryDb) {
        throw error;
      }

      console.warn(
        "Failed to connect to MONGO_URI. Falling back to in-memory MongoDB for development."
      );
    }
  }

  if (env.useInMemoryDb) {
    await startInMemoryMongo();
    return;
  }

  throw new Error("MONGO_URI is missing in environment variables.");
}

export async function disconnectDatabase() {
  await mongoose.disconnect();

  if (inMemoryMongoServer) {
    await inMemoryMongoServer.stop();
    inMemoryMongoServer = null;
  }
}
