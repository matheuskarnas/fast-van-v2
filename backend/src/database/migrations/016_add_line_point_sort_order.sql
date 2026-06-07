ALTER TABLE line_points
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

WITH ordered_points AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY line_id, segment
      ORDER BY created_at ASC, id ASC
    ) - 1 AS next_order
  FROM line_points
  WHERE sort_order IS NULL
)
UPDATE line_points lp
   SET sort_order = ordered_points.next_order
  FROM ordered_points
 WHERE lp.id = ordered_points.id;

CREATE INDEX IF NOT EXISTS idx_line_points_line_segment_order
  ON line_points(line_id, segment, sort_order);
