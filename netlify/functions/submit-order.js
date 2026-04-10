const { getStore, connectLambda } = require("@netlify/blobs");

function buildSlots() {
  const slots = [];
  for (let m = 12 * 60; m <= 18 * 60 + 20; m += 20) {
    const h = Math.floor(m / 60);
    const mins = m % 60;
    const p = h >= 12 ? "PM" : "AM";
    const dh = ((h + 11) % 12) + 1;
    slots.push(`${dh}:${String(mins).padStart(2, "0")} ${p}`);
  }
  return slots;
}

function isWeekday(dateString) {
  const d = new Date(`${dateString}T12:00:00`);
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

function makeId() {
  return `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

exports.handler = async (event) => {
  connectLambda(event);

  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method not allowed." })
      };
    }

    const payload = JSON.parse(event.body || "{}");
    const {
  customerName,
  customerPhone,
  customerEmail,
  serviceType,
  preferredDate,
  preferredTime,
  deliveryAddress,
  meetupLocation,
  notes,
  subtotal,
  deliveryFee,
  total,
  summary,
  items
} = payload;

    if (!customerName || !customerPhone || !preferredDate || !preferredTime || !serviceType) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required booking fields." })
      };
    }

    if (!Array.isArray(items) || !items.length) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Cart is empty." })
      };
    }

    if (!isWeekday(preferredDate)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Bookings are available Monday through Friday only." })
      };
    }

    const allowedSlots = buildSlots();
    if (!allowedSlots.includes(preferredTime)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid time slot selected." })
      };
    }

    if (serviceType === "Delivery" && !deliveryAddress) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Delivery address required." })
      };
    }

    if (serviceType === "Meet Up" && !meetupLocation) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Meet Up location required." })
      };
    }

    const store = getStore("bookings");
    const dayKey = `bookings:${preferredDate}:${serviceType}`;
    const rawDay = await store.get(dayKey, { type: "json" });
    const dayRecord = rawDay || { slots: {} };

    if (dayRecord.slots && dayRecord.slots[preferredTime]) {
      const taken = new Set(Object.keys(dayRecord.slots || {}));
      const availableSlots = allowedSlots.filter((slot) => !taken.has(slot));
      return {
        statusCode: 409,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "That time slot was just taken. Please choose another available time.",
          availableSlots
        })
      };
    }

    const booking = {
      id: makeId(),
      customerName,
      customerPhone,
      customerEmail: customerEmail || "",
      serviceType,
      preferredDate,
      preferredTime,
      deliveryAddress: deliveryAddress || "",
      meetupLocation: meetupLocation || "",
      notes: notes || "",
      subtotal: Number(subtotal || 0),
deliveryFee: Number(deliveryFee || 0),
total: Number(total || 0),
summary: summary || "",
items,
createdAt: new Date().toISOString()
    };

    dayRecord.slots = dayRecord.slots || {};
    dayRecord.slots[preferredTime] = booking.id;

    await store.setJSON(dayKey, dayRecord);
    await store.setJSON(`booking:${booking.id}`, booking);
   
    await fetch("https://script.google.com/macros/s/AKfycbwMLkHzBHpRxNeFM28y_R0SZFLtcTakgjVLEEWPRab717M-jCtv8vHv0RdIhKjKxxKF/exec", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: booking.customerName,
    phone: booking.customerPhone,
    orderType: booking.serviceType,
    date: booking.preferredDate,
    time: booking.preferredTime,
    items: booking.summary,
    total: booking.subtotal,
    notes: booking.notes
  })
});

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, booking })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Booking submit failed." })
    };
  }
};
