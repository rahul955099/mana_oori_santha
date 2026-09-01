import dotenv from "dotenv";
dotenv.config();

function report(name: string) {
  const v = process.env[name];
  if (v === undefined) {
    console.log(`${name}: NOT SET (key missing from .env)`);
    return;
  }
  if (v.trim().length === 0) {
    console.log(`${name}: EMPTY (key present but value is blank)`);
    return;
  }
  console.log(`${name}: present, length=${v.length}, startsWithWhitespace=${/^\s/.test(v)}, endsWithWhitespace=${/\s$/.test(v)}, hasHashChar=${v.includes("#")}, hasQuoteChar=${/^['"]|['"]$/.test(v)}`);
}

report("MONGODB_URI");
report("JWT_SECRET");
report("PORT");
report("CLIENT_URL");
