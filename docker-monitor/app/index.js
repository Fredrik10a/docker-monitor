const express = require('express');
const app = express();
const port = 8080;

let counter = 0;
const crashAfter = 3; // Set the counter value at which the app will crash

// Endpoint to return the current counter value (Health Check)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

setInterval(() => {
    console.log(counter);
    counter++;

    if (counter >= crashAfter) {
        // Simulate a crash by throwing an error
        throw new Error('Simulated crash');
    }
}, 2000);

app.listen(port, () => {
    console.log(`App running on http://localhost:${port}`);
});
