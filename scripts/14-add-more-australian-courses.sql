-- Add more popular Australian golf courses to the database

-- Royal Melbourne (West Course)
INSERT INTO australian_golf_courses (
  id, golfselect_id, name, location, address, suburb, state, postcode,
  phone, website, par, length_meters, architect, design_year,
  description, holes, created_at, updated_at
) VALUES (
  gen_random_uuid()::text,
  1,
  'Royal Melbourne (West Course)',
  'Cheltenham Rd, Black Rock VIC 3193',
  'Cheltenham Road',
  'Black Rock',
  'VIC',
  '3193',
  '(03) 9598 6755',
  'https://www.royalmelbourne.com.au',
  71,
  5953,
  'Alister MacKenzie',
  1926,
  'Regarded as one of the greatest golf courses in the world, Royal Melbourne West Course is a masterpiece of strategic design featuring exceptional bunkering and lightning-fast greens.',
  '[
    {"number":1,"par":4,"length":416,"strokeIndex":11},
    {"number":2,"par":4,"length":355,"strokeIndex":7},
    {"number":3,"par":4,"length":333,"strokeIndex":15},
    {"number":4,"par":4,"length":405,"strokeIndex":1},
    {"number":5,"par":3,"length":169,"strokeIndex":17},
    {"number":6,"par":5,"length":412,"strokeIndex":9},
    {"number":7,"par":4,"length":129,"strokeIndex":13},
    {"number":8,"par":3,"length":283,"strokeIndex":5},
    {"number":9,"par":4,"length":399,"strokeIndex":3},
    {"number":10,"par":4,"length":297,"strokeIndex":14},
    {"number":11,"par":4,"length":404,"strokeIndex":4},
    {"number":12,"par":4,"length":420,"strokeIndex":2},
    {"number":13,"par":3,"length":140,"strokeIndex":18},
    {"number":14,"par":4,"length":312,"strokeIndex":12},
    {"number":15,"par":4,"length":382,"strokeIndex":8},
    {"number":16,"par":3,"length":148,"strokeIndex":16},
    {"number":17,"par":5,"length":499,"strokeIndex":6},
    {"number":18,"par":4,"length":397,"strokeIndex":10}
  ]'::jsonb,
  NOW(),
  NOW()
);

-- Kingston Heath
INSERT INTO australian_golf_courses (
  id, golfselect_id, name, location, address, suburb, state, postcode,
  phone, website, par, length_meters, architect, design_year,
  description, holes, created_at, updated_at
) VALUES (
  gen_random_uuid()::text,
  2,
  'Kingston Heath',
  '92 Kingston Road, Cheltenham VIC 3192',
  '92 Kingston Road',
  'Cheltenham',
  'VIC',
  '3192',
  '(03) 9551 4455',
  'https://www.kingstonheath.com.au',
  72,
  6062,
  'Dan Soutar',
  1925,
  'A world-class championship course featuring strategic bunkering, subtle green contours, and classic Australian sandbelt characteristics.',
  '[
    {"number":1,"par":4,"length":367,"strokeIndex":13},
    {"number":2,"par":4,"length":154,"strokeIndex":17},
    {"number":3,"par":3,"length":384,"strokeIndex":5},
    {"number":4,"par":4,"length":374,"strokeIndex":11},
    {"number":5,"par":4,"length":166,"strokeIndex":15},
    {"number":6,"par":3,"length":427,"strokeIndex":1},
    {"number":7,"par":4,"length":510,"strokeIndex":7},
    {"number":8,"par":5,"length":136,"strokeIndex":9},
    {"number":9,"par":3,"length":383,"strokeIndex":3},
    {"number":10,"par":4,"length":311,"strokeIndex":14},
    {"number":11,"par":4,"length":151,"strokeIndex":16},
    {"number":12,"par":3,"length":119,"strokeIndex":18},
    {"number":13,"par":3,"length":334,"strokeIndex":12},
    {"number":14,"par":4,"length":421,"strokeIndex":2},
    {"number":15,"par":4,"length":513,"strokeIndex":4},
    {"number":16,"par":5,"length":138,"strokeIndex":10},
    {"number":17,"par":3,"length":336,"strokeIndex":8},
    {"number":18,"par":4,"length":407,"strokeIndex":6}
  ]'::jsonb,
  NOW(),
  NOW()
);

-- NSW Golf Club
INSERT INTO australian_golf_courses (
  id, golfselect_id, name, location, address, suburb, state, postcode,
  phone, website, par, length_meters, architect, design_year,
  description, holes, created_at, updated_at
) VALUES (
  gen_random_uuid()::text,
  3,
  'NSW Golf Club',
  'Henry Head, La Perouse NSW 2036',
  'Henry Head',
  'La Perouse',
  'NSW',
  '2036',
  '(02) 9661 4455',
  'https://www.nswgolfclub.com.au',
  72,
  6170,
  'Alister MacKenzie',
  1928,
  'A spectacular coastal links-style course with stunning views of Botany Bay, featuring deep bunkers and challenging ocean winds.',
  '[
    {"number":1,"par":4,"length":355,"strokeIndex":13},
    {"number":2,"par":5,"length":469,"strokeIndex":9},
    {"number":3,"par":4,"length":351,"strokeIndex":15},
    {"number":4,"par":4,"length":370,"strokeIndex":7},
    {"number":5,"par":3,"length":153,"strokeIndex":17},
    {"number":6,"par":5,"length":492,"strokeIndex":3},
    {"number":7,"par":4,"length":358,"strokeIndex":11},
    {"number":8,"par":3,"length":157,"strokeIndex":5},
    {"number":9,"par":4,"length":330,"strokeIndex":1},
    {"number":10,"par":4,"length":379,"strokeIndex":10},
    {"number":11,"par":4,"length":356,"strokeIndex":14},
    {"number":12,"par":3,"length":173,"strokeIndex":16},
    {"number":13,"par":4,"length":372,"strokeIndex":8},
    {"number":14,"par":5,"length":448,"strokeIndex":4},
    {"number":15,"par":4,"length":391,"strokeIndex":6},
    {"number":16,"par":3,"length":169,"strokeIndex":18},
    {"number":17,"par":4,"length":341,"strokeIndex":12},
    {"number":18,"par":4,"length":406,"strokeIndex":2}
  ]'::jsonb,
  NOW(),
  NOW()
);
