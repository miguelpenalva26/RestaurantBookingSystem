const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Restaurant API is running');
});

app.get('/tables', (req, res) => {
  db.query('SELECT * FROM tables', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

app.get('/reservations', (req, res) => {
  const { date } = req.query;

  let query = `
    SELECT r.*, t.capacity, t.location
    FROM reservations r
    JOIN tables t ON r.table_id = t.id
  `;

  let params = [];

  if (date) {
    query += ' WHERE r.reservation_date = ?';
    params.push(date);
  }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error fetching reservations' });
    res.json(results);
  });
});

app.post('/reservations', (req, res) => {
  const { customer_name, email, reservation_date, reservation_time, guests } = req.body;

  if (!customer_name || !email || !reservation_date || !reservation_time || !guests) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const tableQuery = `
    SELECT * FROM tables
    WHERE capacity >= ?
    ORDER BY capacity ASC
  `;

  db.query(tableQuery, [guests], (err, tables) => {
    if (err) return res.status(500).json({ error: 'Error fetching tables' });

    if (tables.length === 0) {
      return res.status(400).json({ error: 'No tables available' });
    }

    const reservationQuery = `
      SELECT table_id FROM reservations
      WHERE reservation_date = ? AND reservation_time = ?
    `;

    db.query(reservationQuery, [reservation_date, reservation_time], (err, reservations) => {
      if (err) return res.status(500).json({ error: 'Error checking reservations' });

      const occupiedTables = reservations.map(r => r.table_id);
      const availableTable = tables.find(t => !occupiedTables.includes(t.id));

      if (!availableTable) {
        return res.status(400).json({ error: 'No available tables at this time' });
      }

      const insertQuery = `
        INSERT INTO reservations 
        (customer_name, email, reservation_date, reservation_time, guests, table_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertQuery,
        [customer_name, email, reservation_date, reservation_time, guests, availableTable.id],
        (err, result) => {
          if (err) return res.status(500).json({ error: 'Error creating reservation' });

          res.json({
            message: 'Reservation created successfully',
            table_assigned: availableTable
          });
        }
      );
    });
  });
});

app.delete('/reservations/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM reservations WHERE id = ?';

  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error deleting reservation' });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    res.json({ message: 'Reservation deleted successfully' });
  });
});

app.put('/reservations/:id', (req, res) => {
  const { id } = req.params;
  const { customer_name, email, reservation_date, reservation_time, guests } = req.body;

  if (!customer_name || !email || !reservation_date || !reservation_time || !guests) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  db.query('SELECT * FROM reservations WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'Reservation not found' });

    const tableQuery = `
      SELECT * FROM tables
      WHERE capacity >= ?
      ORDER BY capacity ASC
    `;

    db.query(tableQuery, [guests], (err, tables) => {
      if (err) return res.status(500).json({ error: 'Error fetching tables' });
      if (tables.length === 0) return res.status(400).json({ error: 'No tables available for this party size' });

    
      const reservationQuery = `
        SELECT table_id FROM reservations
        WHERE reservation_date = ? AND reservation_time = ? AND id != ?
      `;

      db.query(reservationQuery, [reservation_date, reservation_time, id], (err, reservations) => {
        if (err) return res.status(500).json({ error: 'Error checking availability' });

        const occupiedTables = reservations.map(r => r.table_id);
        const availableTable = tables.find(t => !occupiedTables.includes(t.id));

        if (!availableTable) {
          return res.status(400).json({ error: 'No available tables at this time' });
        }

        const updateQuery = `
          UPDATE reservations
          SET customer_name = ?, email = ?, reservation_date = ?, reservation_time = ?, guests = ?, table_id = ?
          WHERE id = ?
        `;

        db.query(
          updateQuery,
          [customer_name, email, reservation_date, reservation_time, guests, availableTable.id, id],
          (err, result) => {
            if (err) return res.status(500).json({ error: 'Error updating reservation' });

            res.json({
              message: 'Reservation updated successfully',
              table_assigned: availableTable
            });
          }
        );
      });
    });
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});