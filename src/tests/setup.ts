import mongoose from "mongoose";
import { config } from "dotenv";
import path from "path";
import { MongoMemoryServer } from "mongodb-memory-server";

// Load test environment variables
config({ path: path.resolve(__dirname, "../../.env.test") });

let mongod: MongoMemoryServer;

beforeAll(async () => {
  // Create an in-memory MongoDB instance
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Set the URI for tests
  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(() => {
  jest.clearAllMocks();
});
