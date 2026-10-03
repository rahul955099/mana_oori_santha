import mongoose from "mongoose";
import { env } from "./env";

/** Used when the connection string doesn't name a database (Atlas's copied
 * strings don't), so data doesn't end up in MongoDB's default "test" database. */
const DEFAULT_DB_NAME = "mana-oori-santha";

function namesDatabase(uri: string): boolean {
  // mongodb[+srv]://user:pass@host[,host...]/<db>?options
  const afterHosts = uri.replace(/^mongodb(\+srv)?:\/\/[^/]*/, "");
  return /^\/[^/?]+/.test(afterHosts);
}

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);
  const dbName = namesDatabase(env.mongodbUri) ? undefined : process.env.MONGODB_DB || DEFAULT_DB_NAME;
  await mongoose.connect(env.mongodbUri, dbName ? { dbName } : {});
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
