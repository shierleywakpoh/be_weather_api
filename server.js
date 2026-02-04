import express from "express";
const app = express();
import axios from "axios";
import "dotenv/config";
import { rateLimit } from "express-rate-limit";
import { createClient } from "redis";

const client = createClient({
  socket: {
    host: "127.0.0.1",
    port: 6379,
  },
});

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 7,

  message: {
    message: "Too many requests, please try again later",
  },
});

app.use(limiter);

client.on("error", (err) => console.log("Redis Client Error", err));
await client.connect();

app.get("/", (req, res) => {
  res.json({ message: "sucessfully" });
});

app.get("/api/:kota", async (req, res) => {
  try {
    const kota = req.params.kota;
    if (!kota) return res.status(400).json({ message: "missing city" });
    const a =
      "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/";

    let url = a + kota + `?key=${process.env.VISUAL_CROSSING_API_KEY}`;
    const result = await client.get(`${kota}`);
    if (result) return res.status(201).json(result);

    const data = await axios.get(url);
    if (data) {
      client.set(`${kota}`, JSON.stringify(data.data.currentConditions), {
        expiration: {
          type: "EX",
          value: 60 * 60 * 12,
        },
        GET: true,
      });
      res.status(201).json(data.data.currentConditions);
    } else {
      return res.json({ message: "missing data" });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch weather data",
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
