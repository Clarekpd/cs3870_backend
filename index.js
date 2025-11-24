import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

// Load environment variables FIRST
dotenv.config();

// Create Express app
const app = express();
// Middleware
app.use(cors());
app.use(express.json()); // replaces body-parser

// MongoDB
const url = process.env.MONGO_URI;
const dbName = process.env.DBNAME;
const COLLECTION = process.env.COLLECTION;

const client = new MongoClient(url);
const db = client.db(dbName);

// Server configuration
const PORT = process.env.PORT ?? 8081;
const HOST = process.env.HOST ?? "0.0.0.0";

// Start server
app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});

app.get("/name", (req, res) => {
    res.send("My name is Clare");
})

app.get("/contacts", async (req, res) => {
    await client.connect();
    console.log("Node connected successfully to GET MongoDB");

    const query = {};
    const results = await db
        .collection(COLLECTION)
        .find(query)
        .limit(100)
        .toArray();
    console.log(results);

    res.status(200);
    // res.send(results);
    res.json(results);
});

app.post("/contacts", async (req, res) => {
    try {
        // The body exists
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).send({ message: 'Bad request: No data provided.' });
        }
        const { contact_name, phone_number, message, image_url } = req.body;

        // Connect to MongoDB
        await client.connect();
        console.log("Node connected successfully to POST MongoDB");

        // Reference collection
        const contactsCollection = db.collection(COLLECTION);

        // Check if contact already exists
        const existingContact = await contactsCollection.findOne({
            contact_name: contact_name,
        });
        if (existingContact) {
            return res.status(409).json({
                message: `Contact with name '${contact_name}' already exists.`,
            });
        }

        // Create new Document to POST
        const newDocument = {
            contact_name,
            phone_number,
            message,
            image_url,
        };
        console.log(newDocument);

        // Insert new document into MongoDB
        const result = await contactsCollection.insertOne(newDocument);
        console.log("Document inserted:", result);

        // Acknowledge frontend
        res.status(201);
        res.json({ message: "New contact added successfully" });
    } catch (error) {
        console.error("Error in POST /contacts:", error);
        res.status(500);
        res.json({ message: "Failed to add contact: " + error.message });
    } finally {
        await client.close();
    }
});

app.delete("/contacts/:name", async (req, res) => {
    try {
        // Read parameter id
        const name = req.params.name;
        console.log("Contact to delete :", name);
        // Connect to MongoDB
        await client.connect();
        console.log("Node connected successfully to POST MongoDB");
        // Reference collection
        const contactsCollection = db.collection(COLLECTION);
        // Check if contact already exists
        const existingContact = await contactsCollection.findOne({
            contact_name: name,
        });
        if (!existingContact) {
            return res.status(404).json({
                message: `Contact with name ${name} does NOT exist.`,
            });
        }
        // Define query
        const query = { contact_name: name };
        // Delete one contact
        const results = await db.collection("contacts").deleteOne(query);
        // Response to Client
        res.status(200);
        // res.send(results);
        res.send({ message: `Contact ${name} was DELETED successfully.` });
    }
    catch (error) {
        console.error("Error deleting robot:", error);
        res.status(500).send({ message: 'Internal Server Error' + error });
    }
});

// UPDATE contact by name
app.put("/contacts/:name", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'Bad request: No data provided for update.' });
        }

        const name = req.params.name;
        // Only allow these fields to be updated
        const allowed = ["contact_name", "phone_number", "message", "image_url"];
        const updates = {};
        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                updates[key] = req.body[key];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No valid fields provided to update.' });
        }

        // Connect to MongoDB
        await client.connect();
        console.log("Node connected successfully to UPDATE MongoDB");

        const contactsCollection = db.collection(COLLECTION);

        // Perform the update
        const result = await contactsCollection.updateOne(
            { contact_name: name },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: `Contact '${name}' not found.` });
        }

        return res.status(200).json({ message: `Contact '${name}' updated.` });
    } catch (error) {
        console.error("Error in PUT /contacts/:name:", error);
        return res.status(500).json({ message: "Failed to update contact: " + error.message });
    } finally {
        await client.close();
    }
});

// GET single contact by name
app.get("/contacts/:name", async (req, res) => {
    try {
        const name = req.params.name;
        if (!name) {
            return res.status(400).json({ message: 'Bad request: name parameter is required.' });
        }

        // Connect to MongoDB
        await client.connect();
        console.log("Node connected successfully to GET (single) MongoDB");

        const contactsCollection = db.collection(COLLECTION);
        const contact = await contactsCollection.findOne({ contact_name: name });
        if (!contact) {
            return res.status(404).json({ message: `Contact with name '${name}' not found.` });
        }

        return res.status(200).json(contact);
    } catch (error) {
        console.error("Error in GET /contacts/:name:", error);
        return res.status(500).json({ message: "Failed to fetch contact: " + error.message });
    } finally {
        await client.close();
    }
});



