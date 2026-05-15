const API_URL = 'https://restaurantbookingsystem-production.up.railway.app';

const form = document.getElementById('reservationForm');
const message = document.getElementById('message');
const list = document.getElementById('reservationsList');
const submitBtn = document.getElementById('submitBtn');

let editingId = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    customer_name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    reservation_date: document.getElementById('date').value,
    reservation_time: document.getElementById('time').value + ':00',
    guests: document.getElementById('guests').value
  };

  try {
    // If editing, send PUT to update; otherwise send POST to create
    const isEditing = editingId !== null;
    const url = isEditing ? `${API_URL}/reservations/${editingId}` : `${API_URL}/reservations`;
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.ok) {
      // Show success message, reset form, and reload the list
      message.textContent = isEditing ? "Reservation updated successfully!" : "Reservation created successfully!";
      message.style.color = "green";
      form.reset();
      cancelEdit();
      loadReservations();
    } else {
      // Show error returned from the API
      message.textContent = result.error;
      message.style.color = "red";
    }

  } catch (error) {
    message.textContent = "Error connecting to server";
    message.style.color = "red";
  }
});

// Fetch all reservations from the API and show them as list items
async function loadReservations() {
  try {
    const res = await fetch(API_URL + '/reservations');
    const data = await res.json();

    list.innerHTML = '';

    data.forEach(r => {
      const li = document.createElement('li');

      // Format the date and trim time to HH:MM
      const formattedDate = new Date(r.reservation_date).toLocaleDateString();
      const timeFormatted = r.reservation_time.slice(0, 5);

      li.innerHTML = `
        <span>
          <strong>${r.customer_name}</strong> (${r.email}) - 
          ${formattedDate} at ${timeFormatted} 
          · ${r.guests} guests · Table ${r.table_id} (capacity ${r.capacity}, ${r.location})
        </span>
        <div class="actions">
          <button class="btn-edit" onclick="startEdit(${r.id}, '${r.customer_name}', '${r.email}', '${r.reservation_date}', '${timeFormatted}', ${r.guests})">Edit</button>
          <button class="btn-delete" onclick="deleteReservation(${r.id})">Delete</button>
        </div>
      `;

      list.appendChild(li);
    });

  } catch (error) {
    console.error("Error loading reservations:", error);
  }
}

function startEdit(id, name, email, date, time, guests) {
  editingId = id;

  document.getElementById('name').value = name;
  document.getElementById('email').value = email;
  document.getElementById('date').value = date.slice(0, 10);
  document.getElementById('time').value = time;
  document.getElementById('guests').value = guests;

  submitBtn.textContent = 'Update Reservation';
  message.textContent = `Editing reservation #${id}`;
  message.style.color = "orange";

  window.scrollTo(0, 0);
}

function cancelEdit() {
  editingId = null;
  submitBtn.textContent = 'Book Table';
  message.textContent = '';
  form.reset();
}

// Delete a reservation after user confirmation
async function deleteReservation(id) {
  if (!confirm('Are you sure you want to delete this reservation?')) return;

  try {
    await fetch(API_URL + '/reservations/' + id, {
      method: 'DELETE'
    });

    // If the deleted reservation was being edited, cancel edit mode
    if (editingId === id) cancelEdit();
    loadReservations();

  } catch (error) {
    console.error("Error deleting reservation:", error);
  }
}

// Prevent users from selecting past dates in the date picker
document.getElementById('date').min = new Date().toISOString().split('T')[0];

// Public Holiday Check
async function checkPublicHoliday(date) {
  if (!date) return;

  const year = date.split('-')[0];
 //External API
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/GB`);
    const holidays = await res.json();

    const holiday = holidays.find(h => h.date === date);

    const warningEl = document.getElementById('holidayWarning');

    if (holiday) {
      warningEl.textContent = `⚠️ This date is a public holiday (${holiday.localName}). The restaurant may have special opening hours.`;
      warningEl.style.display = 'block';
    } else {
      warningEl.textContent = '';
      warningEl.style.display = 'none';
    }

  } catch (error) {
    console.error('Error checking public holidays:', error);
  }
}

document.getElementById('date').addEventListener('change', (e) => {
  checkPublicHoliday(e.target.value);
});
document.getElementById('tableForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    capacity: document.getElementById('tableCapacity').value,
    location: document.getElementById('tableLocation').value
  };

  try {
    const res = await fetch(API_URL + '/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    const tableMessage = document.getElementById('tableMessage');

    if (res.ok) {
      tableMessage.textContent = 'Table added successfully!';
      tableMessage.style.color = 'green';
      document.getElementById('tableForm').reset();
    } else {
      tableMessage.textContent = result.error;
      tableMessage.style.color = 'red';
    }

  } catch (error) {
    document.getElementById('tableMessage').textContent = 'Error connecting to server';
  }
});
loadReservations();