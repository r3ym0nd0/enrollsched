const db = require("../config/db");

async function getTimeSlots(req, res) {
  const [slots] = await db.execute(`
    SELECT
      ts.id,
      ts.slot_label AS slotLabel,
      TIME_FORMAT(ts.start_time, '%h:%i %p') AS startTime,
      TIME_FORMAT(ts.end_time, '%h:%i %p') AS endTime,
      ts.capacity,
      ts.is_active AS isActive,
      CASE
        WHEN ts.slot_label LIKE '%Lunch Break%' THEN TRUE
        ELSE FALSE
      END AS isBreak,
      COUNT(pr.id) AS bookedCount,
      GREATEST(ts.capacity - COUNT(pr.id), 0) AS remainingSlots,
      CASE
        WHEN COUNT(pr.id) >= ts.capacity THEN TRUE
        ELSE FALSE
      END AS isFull
    FROM time_slots ts
    LEFT JOIN pre_registrations pr
      ON pr.time_slot_id = ts.id
      AND pr.status IN ('pending', 'approved', 'confirmed')
    WHERE ts.is_active = TRUE
      OR ts.slot_label LIKE '%Lunch Break%'
    GROUP BY
      ts.id,
      ts.slot_label,
      ts.start_time,
      ts.end_time,
      ts.capacity,
      ts.is_active
    ORDER BY ts.start_time ASC
  `);

  return res.json({ slots });
}

module.exports = {
  getTimeSlots
};
