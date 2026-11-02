const crypto = require("crypto");
const { JWT_SECRET } = require("../config/env");
const b64url = (value) => Buffer.from(value).toString("base64url");

const signToken = (user) => {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  }));
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
};

const verifyToken = (token) => {
  const [header, payload, signature] = String(token).split(".");
  if (!header || !payload || !signature) throw new Error("Invalid token");
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Invalid signature");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (data.exp && data.exp < Math.floor(Date.now() / 1000)) throw new Error("Expired token");
  return data;
};

module.exports = { signToken, verifyToken };
