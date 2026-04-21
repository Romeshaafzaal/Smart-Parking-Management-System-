CREATE DATABASE SmartParkingsystem;
GO
USE SmartParkingsystem;
GO

-- Users
CREATE TABLE users (
  userID INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  email NVARCHAR(100) UNIQUE NOT NULL,
  password NVARCHAR(255) NOT NULL,
  role NVARCHAR(10) DEFAULT 'user' CHECK (role IN ('admin','user')),
  createdAt DATETIME DEFAULT GETDATE()
);

-- Parking Slots
CREATE TABLE parking_slots (
  slotID INT IDENTITY(1,1) PRIMARY KEY,
  slotNumber NVARCHAR(20) UNIQUE NOT NULL,
  floorNumber INT DEFAULT 1,
  status NVARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available','Occupied','Reserved')),
  isReserved BIT DEFAULT 0
);

-- Vehicles
CREATE TABLE vehicles (
  vehicleID INT IDENTITY(1,1) PRIMARY KEY,
  plateNumber NVARCHAR(20) UNIQUE NOT NULL,
  vehicleType NVARCHAR(20) CHECK (vehicleType IN ('Car','Motorbike','Truck','Van')),
  ownerName NVARCHAR(100),
  phone NVARCHAR(20),
  userID INT REFERENCES users(userID) ON DELETE SET NULL
);

-- Parking Records
CREATE TABLE parking_records (
  recordID INT IDENTITY(1,1) PRIMARY KEY,
  vehicleID INT REFERENCES vehicles(vehicleID),
  slotID INT REFERENCES parking_slots(slotID),
  entryTime DATETIME DEFAULT GETDATE(),
  exitTime DATETIME NULL,
  fee DECIMAL(10,2) NULL
);

-- Payments
CREATE TABLE payments (
  paymentID INT IDENTITY(1,1) PRIMARY KEY,
  recordID INT REFERENCES parking_records(recordID),
  amount DECIMAL(10,2),
  paymentMethod NVARCHAR(20) DEFAULT 'Cash' CHECK (paymentMethod IN ('Cash','Card','Online')),
  paymentTime DATETIME DEFAULT GETDATE(),
  status NVARCHAR(20) DEFAULT 'Paid' CHECK (status IN ('Paid','Pending'))
);

-- Reservations
CREATE TABLE reservations (
  reservationID INT IDENTITY(1,1) PRIMARY KEY,
  vehicleID INT REFERENCES vehicles(vehicleID),
  slotID INT REFERENCES parking_slots(slotID),
  userID INT REFERENCES users(userID),
  startTime DATETIME,
  endTime DATETIME,
  status NVARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active','Cancelled','Completed'))
);

-- Rates
CREATE TABLE rates (
  rateID INT IDENTITY(1,1) PRIMARY KEY,
  vehicleType NVARCHAR(50),
  pricePerHour DECIMAL(10,2)
);

-- Fines
CREATE TABLE fines (
  fineID INT IDENTITY(1,1) PRIMARY KEY,
  recordID INT REFERENCES parking_records(recordID),
  reason NVARCHAR(255),
  amount DECIMAL(10,2),
  issuedAt DATETIME DEFAULT GETDATE(),
  status NVARCHAR(20) DEFAULT 'Unpaid' CHECK (status IN ('Unpaid','Paid'))
);

-- Seed slots
INSERT INTO parking_slots (slotNumber, floorNumber) VALUES
('A101',1),('A102',1),('A103',1),('A104',1),('A105',1),('A106',1),('A107',1),('A108',1),
('B201',2),('B202',2),('B203',2),('B204',2),('B205',2),('B206',2),('B207',2),('B208',2);

INSERT INTO users ( name,email , password, role)VALUES
('Minahil' ,'minahil@gmail.com',123456,'admin');

-- Seed rates
INSERT INTO rates (vehicleType, pricePerHour) VALUES
('Car',100),('Motorbike',50),('Truck',200),('Van',150);
GO

UPDATE users SET role = 'admin' WHERE email = 'me@gmail.com';


-- ============================================================
-- Smart Parking System - DB Migration / Setup Script
-- Run this against your SmartParkingsystem database
-- ============================================================

-- Add userID and vehicleID columns to fines table (if not already present)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME='fines' AND COLUMN_NAME='userID'
)
  ALTER TABLE fines ADD userID INT NULL REFERENCES users(userID);

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME='fines' AND COLUMN_NAME='vehicleID'
)
  ALTER TABLE fines ADD vehicleID INT NULL REFERENCES vehicles(vehicleID);

-- Ensure fineID column exists in payments table
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME='payments' AND COLUMN_NAME='fineID'
)
  ALTER TABLE payments ADD fineID INT NULL REFERENCES fines(fineID);

-- Ensure reservationID column exists in payments table
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME='payments' AND COLUMN_NAME='reservationID'
)
  ALTER TABLE payments ADD reservationID INT NULL REFERENCES reservations(reservationID);

-- Ensure recordID in payments is nullable (may already be)
-- ALTER TABLE payments ALTER COLUMN recordID INT NULL;

-- Ensure fines.recordID is nullable
IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME='fines' AND COLUMN_NAME='recordID' AND IS_NULLABLE='NO'
)
  ALTER TABLE fines ALTER COLUMN recordID INT NULL;

PRINT 'Migration complete.';