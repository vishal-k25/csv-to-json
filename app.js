require('dotenv').config()
import express, { json } from "express";
import { readFileSync } from "fs";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: 5432,
});

// Middleware to parse JSON request bodies
app.use(json());

// Function to parse CSV to JSON
function parseCSVtoJSON(filePath) {
  const fileContent = readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");

  const headers = lines[0].split(",").map((header) => header.trim());
  const jsonData = [];

  for (let i = 1; i < lines.length; i++) {
    const data = lines[i].split(",");
    const obj = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = data[j].trim();

      // If header has dot (.) notation, create nested objects
      if (header.includes(".")) {
        const nestedKeys = header.split(".");
        let nestedObj = obj;

        for (let k = 0; k < nestedKeys.length - 1; k++) {
          const nestedKey = nestedKeys[k];
          if (!nestedObj[nestedKey]) {
            nestedObj[nestedKey] = {};
          }
          nestedObj = nestedObj[nestedKey];
        }

        nestedObj[nestedKeys[nestedKeys.length - 1]] = value;
      } else {
        obj[header] = value;
      }
    }

    jsonData.push(obj);
  }

  return jsonData;
}

// Endpoint to upload CSV and convert to JSON
app.post("/upload-csv", async (req, res) => {
  const filePath = req.body.filePath; // Assuming filePath is provided in the request body

  try {
    const jsonData = parseCSVtoJSON(filePath);
    const client = await pool.connect();

    await Promise.all(
      jsonData.map(async (row) => {
        const {
          "name.firstName": firstName,
          "name.lastName": lastName,
          age,
          ...rest
        } = row;
        const address = {
          line1: rest["address.line1"],
          line2: rest["address.line2"],
          city: rest["address.city"],
          state: rest["address.state"],
        };
        delete rest["address.line1"];
        delete rest["address.line2"];
        delete rest["address.city"];
        delete rest["address.state"];

        const additionalInfo = {};
        for (const key in rest) {
          additionalInfo[key] = rest[key];
        }

        await client.query(
          "INSERT INTO public.users (name, age, address, additional_info) VALUES ($1, $2, $3, $4)",
          [
            `${firstName} ${lastName}`,
            age,
            JSON.stringify(address),
            JSON.stringify(additionalInfo),
          ]
        );
      })
    );

    await client.release();
    console.log("CSV data uploaded to the database successfully.");
    res.status(200).send("CSV data uploaded to the database successfully.");
  } catch (err) {
    console.error("Error uploading CSV data to the database", err);
    res.status(500).send("Internal Server Error");
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
