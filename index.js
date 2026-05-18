const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// ✅ Import Better Auth utilities
const { toNodeHandler } = require("better-auth/node");
const { auth } = require("./auth"); // Make sure this points to your Better Auth config file

const app = express();
const port = process.env.PORT || 5000;

// ==========================================
// ✅ 1. GLOBAL CORS CONFIGURATION
// ==========================================
const allowedOrigins = [
  "http://localhost:3000",
  "https://wanderlust-tawny-ten.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("CORS Policy Violation"), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  }),
);

// Handle browser preflight OPTIONS requests globally
app.options("*", cors());

// ==========================================
// ✅ 2. BETTER AUTH MOUNT (CRITICAL: MUST BE BEFORE express.json())
// ==========================================
app.all("/api/auth/*", toNodeHandler(auth));

// ==========================================
// ✅ 3. PARSING MIDDLEWARE (CRITICAL: MUST BE AFTER BETTER AUTH)
// ==========================================
app.use(express.json());

// ==========================================
// ✅ 4. MONGODB CONNECTION & APP ROUTES
// ==========================================
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    const db = client.db("wanderlustDB");
    const destinationCollection = db.collection("destinations");
    const bookingCollection = db.collection("bookings");

    console.log("✅ Successfully connected to MongoDB!");

    // --- DESTINATION ROUTES ---

    // GET - All destinations
    app.get("/destinations", async (req, res) => {
      const result = await destinationCollection.find().toArray();
      res.send(result);
    });

    // GET - Single destination by ID
    app.get("/destinations/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: "Invalid ID format" });
        }
        const result = await destinationCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!result) {
          return res.status(404).json({ error: "Destination not found" });
        }
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // POST - Add destination
    app.post("/destinations", async (req, res) => {
      const result = await destinationCollection.insertOne(req.body);
      res.send(result);
    });

    // PATCH - Update destination
    app.patch("/destinations/:id", async (req, res) => {
      const id = req.params.id;
      const result = await destinationCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: req.body },
      );
      res.send(result);
    });

    // DELETE - Destination
    app.delete("/destinations/:id", async (req, res) => {
      const id = req.params.id;
      const result = await destinationCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // --- BOOKING ROUTES ---

    // GET - All bookings
    app.get("/bookings", async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    });

    // GET - Check if specific booking exists
    app.get("/bookings/check", async (req, res) => {
      const { userId, destinationId } = req.query;
      try {
        const booking = await bookingCollection.findOne({
          userId,
          destinationId,
        });
        res.send({ exists: !!booking });
      } catch (error) {
        res.status(500).send({ message: "Error checking booking" });
      }
    });

    // POST - Add booking
    app.post("/bookings", async (req, res) => {
      const result = await bookingCollection.insertOne(req.body);
      res.send(result);
    });

    // DELETE - Booking
    app.delete("/bookings/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await bookingCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 1) {
          res.send({ success: true, message: "Booking deleted" });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Booking not found" });
        }
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // PATCH - Update booking
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const result = await bookingCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: req.body },
      );
      res.send(result);
    });
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}

// Run the DB connection logic
run().catch(console.dir);

// ==========================================
// ✅ 5. BASE & HEALTH ROUTES
// ==========================================
app.get("/", (req, res) => {
  res.send("Wanderlust API is running...");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
