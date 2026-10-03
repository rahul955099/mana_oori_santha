import { Schema, model } from "mongoose";

/** Atomic sequences, e.g. for human-readable order numbers. */
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = model("Counter", counterSchema);

/** Returns offset + 1, offset + 2, ... — unique even under concurrent calls. */
export async function nextSequence(name: string, offset = 0): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return offset + counter!.seq;
}
