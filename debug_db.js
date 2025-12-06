const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./skycheck.db');

db.serialize(() => {
    console.log("--- 🔍 CHECKING DATABASE ---");

    // 1. Check if Users exist
    db.all("SELECT * FROM users LIMIT 3", (err, rows) => {
        if (rows && rows.length > 0) {
            console.log("\n✅ Users found:", rows.length, "examples:");
            console.table(rows); // Pretty prints the data
        } else {
            console.log("\n❌ NO USERS FOUND. Did init_db.js run?");
        }
    });

    // 2. Check for a COMPLETELY VALID combination
    // This query tries to join all 3 tables just like the login app does
    const validQuery = `
        SELECT 
            u.booking_ref, 
            u.flight_number, 
            u.first_name,
            f.tail_number,
            a.model
        FROM users u
        LEFT JOIN flights f ON u.flight_number = f.flight_number
        LEFT JOIN aircrafts a ON f.tail_number = a.tail_number
        LIMIT 5
    `;

    db.all(validQuery, (err, rows) => {
        if (err) console.log(err);
        console.log("\n--- 🎫 TRY USING THESE LOGIN DETAILS ---");
        if (rows && rows.length > 0) {
            rows.forEach(row => {
                console.log(`\nUser: ${row.first_name}`);
                console.log(`Booking Ref: "${row.booking_ref}"`);
                console.log(`Flight Num:  "${row.flight_number}"`);
                
                // Diagnosis
                if (!row.tail_number) console.log("⚠️ WARNING: This flight has no matching Tail Number in 'flights' table.");
                else if (!row.model) console.log("⚠️ WARNING: Tail Number exists, but not found in 'aircrafts' table.");
                else console.log("✅ STATUS: PERFECT! This should work.");
            });
        } else {
            console.log("No valid links found between tables.");
        }
    });
});
