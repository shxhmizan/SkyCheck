const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const dbFile = './skycheck.db';

// 1. Delete old database to start fresh
if (fs.existsSync(dbFile)) {
    try {
        fs.unlinkSync(dbFile);
        console.log("🗑️  Deleted old database.");
    } catch (e) {
        console.log("⚠️  Could not delete DB. If it fails, stop the server first!");
    }
}

const db = new sqlite3.Database(dbFile);

db.serialize(() => {
    // 2. Create Tables
    db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY, booking_ref TEXT, first_name TEXT, last_name TEXT, email TEXT, flight_number TEXT)`);
    db.run(`CREATE TABLE flights (flight_number TEXT, origin TEXT, destination TEXT, departure_time TEXT, tail_number TEXT)`);
    db.run(`CREATE TABLE aircrafts (tail_number TEXT, model TEXT, max_carry_on_weight INTEGER, max_carry_on_dims TEXT)`);

    console.log("✅ Tables created.\n");

    // 3. Helper function to import data with a "Mapper"
    // The 'mapper' function lets us pick exactly which columns we want from the CSV row
    function importCSV(fileName, insertQuery, mapper) {
        const filePath = path.join(__dirname, 'data', fileName);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Missing file: ${fileName}`);
            return;
        }

        console.log(`📂 Processing ${fileName}...`);
        let count = 0;

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                try {
                    // Use the mapper function to get the clean variables
                    const params = mapper(row);
                    
                    // Insert into DB
                    db.run(insertQuery, params, (err) => {
                        if (err) console.log(`   ⚠️ Error row ${count}: ${err.message}`);
                    });
                    count++;
                } catch (e) {
                    console.log(`   ⚠️ Skipped a row in ${fileName} due to missing data.`);
                }
            })
            .on('end', () => {
                console.log(`   🎉 Finished ${fileName}: ${count} rows processed.`);
            });
    }

    // --- IMPORT 1: USERS ---
    // Mapping: booking_id -> booking_ref, passenger_name -> Split First/Last
    importCSV('user_info.csv', 
        `INSERT INTO users (booking_ref, first_name, last_name, email, flight_number) VALUES (?, ?, ?, ?, ?)`,
        (row) => {
            const fullName = row['passenger_name'] || 'Unknown User';
            const nameParts = fullName.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || ''; // Joins the rest as last name

            return [
                row['booking_id'],   // Matches CSV column "booking_id"
                firstName,
                lastName,
                row['user_email'],
                row['flight_number']
            ];
        }
    );

    // --- IMPORT 2: FLIGHTS ---
    // Mapping: Match CSV headers to DB columns
    importCSV('flight_info.csv', 
        `INSERT INTO flights (flight_number, origin, destination, departure_time, tail_number) VALUES (?, ?, ?, ?, ?)`,
        (row) => {
            return [
                row['Flight Number'],
                row['Origin'],
                row['Destination'],
                row['Date'],         // Using Date as departure time
                row['Tail Number']
            ];
        }
    );

    // --- IMPORT 3: AIRCRAFTS ---
    // Mapping: Set Defaults for Carry-On (since CSV seems to be cargo data)
    importCSV('tail_info.csv', 
        `INSERT INTO aircrafts (tail_number, model, max_carry_on_weight, max_carry_on_dims) VALUES (?, ?, ?, ?)`,
        (row) => {
            return [
                row['Tail Number'],
                row['Aircraft Type'],
                7,              // Default 7kg Limit (Standard)
                "22x14x9"       // Default Dimensions (Standard)
            ];
        }
    );
});
