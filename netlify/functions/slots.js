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

exports.handler = async (event) => {
  connectLambda(event);

  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const date = params.get("date");
    const serviceType = params.get("serviceType") || "Pickup";

    if (!date) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing date." })
      };
    }

    if (!isWeekday(date)) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableSlots: [] })
      };
    }

    const store = getStore("bookings");
    const key = `bookings:${date}:${serviceType}`;
    const raw = await store.get(key, { type: "json" });
    const record = raw || { slots: {} };
    const taken = new Set(Object.keys(record.slots || {}));
    const availableSlots = buildSlots().filter((slot) => !taken.has(slot));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availableSlots })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Slot lookup failed." })
    };
  }
};
