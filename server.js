const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./skycheck.db');

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serves your index.html

// API: Login & Get Flight Details
app.post('/api/login', (req, res) => {
    const { bookingRef, flightNum } = req.body;

    // Join Tables: User -> Flight -> Aircraft
    const query = `
        SELECT 
            u.first_name, u.last_name, u.email, u.booking_ref,
            f.flight_number, f.origin, f.destination, f.departure_time,
            a.max_carry_on_dims, a.max_carry_on_weight
        FROM users u
        JOIN flights f ON u.flight_number = f.flight_number
        JOIN aircrafts a ON f.tail_number = a.tail_number
        WHERE u.booking_ref = ? AND u.flight_number = ?
    `;

    db.get(query, [bookingRef, flightNum], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row) {
            res.json({ success: true, data: row });
        } else {
            res.json({ success: false, message: "Booking not found or details mismatch." });
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
