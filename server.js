const express = require('express');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(express.json());

const redisClient = createClient({
    url: process.env.REDIS_URL   // 🔥 important for deployment
});

redisClient.connect()
    .then(() => console.log("Redis Connected"))
    .catch(err => console.error("Redis Error", err));

const PORT = process.env.PORT || 3000;

const seats = ["A1", "A2", "A3", "A4", "A5"];

app.post('/book', async (req, res) => {
    const { seat } = req.body;

    if (!seats.includes(seat)) {
        return res.status(400).json({ message: "Invalid seat" });
    }

    const lockKey = `lock:${seat}`;
    const bookingKey = `booking:${seat}`;

    const lock = await redisClient.set(lockKey, "locked", {
        NX: true,
        EX: 10
    });

    if (!lock) {
        return res.status(409).json({ message: "Seat is being booked or already booked" });
    }

    const alreadyBooked = await redisClient.get(bookingKey);

    if (alreadyBooked) {
        await redisClient.del(lockKey);
        return res.status(409).json({ message: "Seat already booked" });
    }

    const bookingId = uuidv4();
    await redisClient.set(bookingKey, bookingId);

    await redisClient.del(lockKey);

    res.json({
        message: "Seat booked successfully",
        seat,
        bookingId
    });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});