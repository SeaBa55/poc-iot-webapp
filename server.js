const express = require('express');
const cors = require("cors");
const path = require('path');

let ledState = false;

// Setup port and initialize sequelize models
const PORT = process.env.PORT || 8080;

const app = express();
app.use(cors());
app.options("*", cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.resolve(__dirname, './client')));

// Handle GET requests to /api route
app.get("/api", (req, res) => {
    console.log(ledState);
    res.send({ message: ledState });
});

// Handle POST requests to /api route
app.post("/api", (req, res) => {
    console.log(req.body);
    ledState = req.body;
    res.send({
        message: "good request"
    });
});

// All other GET requests not handled before will return our React app
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, './client', 'index2.html'));
});

app.listen(PORT, () => {
    console.log(`🌎 ==> API Server now listening on PORT ${PORT}!`);
});