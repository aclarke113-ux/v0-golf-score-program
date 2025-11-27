-- Create a table for Australian golf courses
CREATE TABLE IF NOT EXISTS australian_golf_courses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  golfselect_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  address TEXT,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  phone TEXT,
  website TEXT,
  par INTEGER,
  length_meters INTEGER,
  architect TEXT,
  design_year INTEGER,
  description TEXT,
  holes JSONB, -- Array of hole data: [{number, par, length}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for searching
CREATE INDEX IF NOT EXISTS idx_australian_golf_courses_name ON australian_golf_courses(name);
CREATE INDEX IF NOT EXISTS idx_australian_golf_courses_state ON australian_golf_courses(state);

-- Insert the Mollymook course as first example
INSERT INTO australian_golf_courses (
  golfselect_id,
  name,
  location,
  address,
  suburb,
  state,
  postcode,
  phone,
  website,
  par,
  length_meters,
  architect,
  design_year,
  description,
  holes
) VALUES (
  607,
  'Mollymook (Hilltop)',
  'Mollymook, NSW',
  'Clifford Close',
  'Mollymook',
  'NSW',
  '2539',
  '02-4454-1912',
  'http://www.mollymookgolf.com.au',
  72,
  6225,
  'Bill Andriske',
  1977,
  'Championship Hilltop course - 18 holes of bushland beauty, ranked in the prestigious Australian Top 100 Golf Courses',
  '[
    {"number": 1, "par": 4, "length": 387},
    {"number": 2, "par": 4, "length": 373},
    {"number": 3, "par": 4, "length": 365},
    {"number": 4, "par": 4, "length": 398},
    {"number": 5, "par": 3, "length": 147},
    {"number": 6, "par": 5, "length": 467},
    {"number": 7, "par": 4, "length": 352},
    {"number": 8, "par": 5, "length": 516},
    {"number": 9, "par": 3, "length": 162},
    {"number": 10, "par": 4, "length": 358},
    {"number": 11, "par": 4, "length": 380},
    {"number": 12, "par": 3, "length": 162},
    {"number": 13, "par": 5, "length": 500},
    {"number": 14, "par": 4, "length": 359},
    {"number": 15, "par": 4, "length": 319},
    {"number": 16, "par": 4, "length": 366},
    {"number": 17, "par": 3, "length": 162},
    {"number": 18, "par": 5, "length": 452}
  ]'::jsonb
) ON CONFLICT (golfselect_id) DO NOTHING;
