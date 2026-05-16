const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const app = express();
const dotEnv = require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(
  cors({
    origin: ["http://localhost:3000", "https://your-frontend-link.vercel.app"],
    credentials: true,
  }),
);
app.use(express.json());

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
    await client.connect();

    const db = client.db("wanderlustDB");
    const destinationCollection = db.collection("destinations");
    const bookingCollection = db.collection("bookings");

    // ✅ POST - Add destination
    app.post("/destinations", async (req, res) => {
      const newdestination = req.body;
      const result = await destinationCollection.insertOne(newdestination);
      res.send(result);
    });

    // ✅ GET - All destinations
    app.get("/destinations", async (req, res) => {
      const cursor = destinationCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    // ✅ GET - Single destination by ID
    app.get("/destinations/:id", async (req, res) => {
      console.log("🔍 HIT /destinations/:id");
      console.log("📌 Received ID:", req.params.id);

      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          console.log("❌ Invalid ObjectId format:", id);
          return res.status(400).json({ error: "Invalid ID format" });
        }

        console.log("✅ ObjectId is valid, querying DB...");

        const query = { _id: new ObjectId(id) };
        const result = await destinationCollection.findOne(query);

        console.log("📦 DB Result:", result);

        if (!result) {
          console.log("⚠️ No document found for ID:", id);
          return res.status(404).json({ error: "Destination not found" });
        }

        console.log("🚀 Sending result for:", result.destinationName);
        res.status(200).json(result);
      } catch (error) {
        console.error("💥 Server Error:", error.message);
        res
          .status(500)
          .json({ error: "Internal server error", details: error.message });
      }
    });

    //update destination :
    app.patch("/destinations/:id", async (req, res) => {
      const id = req.params.id;
      const updatedDestination = req.body;
      const result = await destinationCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedDestination },
      );
      res.send(result);
    });

    //delete destination
    app.delete("/destinations/:id", async (req, res) => {
      const id = req.params.id;
      const result = await destinationCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    //Get booking data :
    app.get("/bookings", async (req, res) => {
      const cursor = bookingCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    // Add this to your Node server file
    app.get("/bookings/check", async (req, res) => {
      const { userId, destinationId } = req.query;

      try {
        // Check if a document exists with both matching IDs
        const booking = await bookingCollection.findOne({
          userId: userId,
          destinationId: destinationId,
        });

        res.send({ exists: !!booking });
      } catch (error) {
        res.status(500).send({ message: "Error checking booking" });
      }
    });

    //post booking data :
    app.post("/bookings", async (req, res) => {
      const newBooking = req.body;
      const result = await bookingCollection.insertOne(newBooking);
      res.send(result);
    });

    //delete booking data :
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const result = await bookingCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    //update booking data :
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBooking = req.body;
      const result = await bookingCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedBooking },
      );
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );

    // ✅ Start listening ONLY after DB is connected and routes are registered
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } finally {
    // await client.close();
  }
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

run().catch(console.dir);
