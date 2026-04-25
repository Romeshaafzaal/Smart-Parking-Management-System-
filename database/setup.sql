IF EXISTS (SELECT name FROM sys.databases WHERE name = 'smartParkingSystemFinal')
DROP DATABASE smartParkingSystemFinal;
GO

CREATE DATABASE smartParkingSystemFinal;
GO

USE smartParkingSystemFinal;
GO

--TABLES

CREATE TABLE Users (
userID INT IDENTITY(1,1) PRIMARY KEY,
Name VARCHAR(50) NOT NULL,
Email VARCHAR(100) NOT NULL UNIQUE,
PassHash VARCHAR(64) NOT NULL,
Role VARCHAR(10) NOT NULL CHECK (Role IN ('Admin','User'))
);
GO

CREATE TABLE Vehicles (
vehicleID INT IDENTITY(1,1) PRIMARY KEY,
PlateNumber VARCHAR(15) NOT NULL UNIQUE,
VehicleType VARCHAR(20) NOT NULL,
Phone VARCHAR(15) NOT NULL,
userID INT NOT NULL FOREIGN KEY REFERENCES Users(userID)
);
GO

CREATE TABLE ParkingSlots (
slotID INT IDENTITY(1,1) PRIMARY KEY,
slotNumber VARCHAR(10) NOT NULL UNIQUE,
status VARCHAR(10) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','Occupied','Reserved')),
floorNumber INT NOT NULL DEFAULT 1
);
GO

CREATE TABLE ParkingRates (
rateID INT IDENTITY(1,1) PRIMARY KEY,
VehicleType VARCHAR(20) NOT NULL UNIQUE,
PricePerHour DECIMAL(6,2) NOT NULL CHECK (PricePerHour > 0)
);
GO

CREATE TABLE ParkingRecords (
recordID INT IDENTITY(1,1) PRIMARY KEY,
vehicleID INT NOT NULL FOREIGN KEY REFERENCES Vehicles(vehicleID),
slotID INT NOT NULL FOREIGN KEY REFERENCES ParkingSlots(slotID),
entryTime DATETIME NOT NULL DEFAULT GETDATE(),
exitTime DATETIME NULL
);
GO

CREATE TABLE Payments (
paymentID INT IDENTITY(1,1) PRIMARY KEY,
recordID INT NOT NULL FOREIGN KEY REFERENCES ParkingRecords(recordID),
Amount DECIMAL(8,2) NOT NULL,
PaymentMethod VARCHAR(20) NOT NULL CHECK (PaymentMethod IN ('Cash','Card','Online')),
PaymentTime DATETIME NOT NULL DEFAULT GETDATE(),
Status VARCHAR(15) NOT NULL DEFAULT 'Pending'
);
GO

CREATE TABLE Reservations (
reservationID INT IDENTITY(1,1) PRIMARY KEY,
vehicleID INT NOT NULL FOREIGN KEY REFERENCES Vehicles(vehicleID),
slotID INT NOT NULL FOREIGN KEY REFERENCES ParkingSlots(slotID),
startTime DATETIME NOT NULL,
endTime DATETIME NOT NULL,
Status VARCHAR(15) NOT NULL DEFAULT 'Active',
CONSTRAINT CK_Time CHECK (endTime > startTime)
);
GO

CREATE TABLE DynamicPricing (
pricingID INT IDENTITY(1,1) PRIMARY KEY,
vehicleType VARCHAR(20) NOT NULL,
slotType VARCHAR(20) NOT NULL,
startTime TIME NOT NULL,
endTime TIME NOT NULL,
dayType VARCHAR(15) NOT NULL CHECK (dayType IN ('Weekday','Weekend','Any')),
demandLevel VARCHAR(10) NOT NULL CHECK (demandLevel IN ('Low','Medium','High')),
pricePerHour DECIMAL(8,2) NOT NULL CHECK (pricePerHour > 0),
CONSTRAINT UQ_DynamicPricing UNIQUE (vehicleType, slotType, dayType, startTime, endTime)
);
GO

CREATE TABLE Fines (
fineID INT IDENTITY(1,1) PRIMARY KEY,
recordID INT FOREIGN KEY REFERENCES ParkingRecords(recordID),
reason VARCHAR(100) NOT NULL,
amount DECIMAL(8,2) NOT NULL,
fineTime DATETIME DEFAULT GETDATE(),
status VARCHAR(15) DEFAULT 'Unpaid'
);
GO

--SAMPLE DATA

INSERT INTO Users (Name, Email, PassHash, Role) VALUES
('Romesha Afzaal', 'romesha@gmail.com', CONVERT(VARCHAR(64), HASHBYTES('SHA2_256','pass'), 2), 'User'),
('Minahil Basalat', 'minahil@gmail.com', CONVERT(VARCHAR(64), HASHBYTES('SHA2_256','pass'), 2), 'User'),
('Aliza Nadeem', 'aliza@gmail.com', CONVERT(VARCHAR(64), HASHBYTES('SHA2_256','pass'), 2), 'User'),
('Iman', 'iman@gmail.com', CONVERT(VARCHAR(64), HASHBYTES('SHA2_256','admin'), 2), 'Admin');
GO

INSERT INTO ParkingRates (VehicleType, PricePerHour) VALUES
('Car', 100),
('Motorbike', 50),
('Truck', 150),
('EV', 120);
GO

INSERT INTO Vehicles (PlateNumber, VehicleType, Phone, userID) VALUES
('LEA5397', 'Car', '0300', 1),
('LEB1234', 'Motorbike', '0301', 2),
('LEC0000', 'Car', '0302', 3);
GO

INSERT INTO ParkingSlots (slotNumber, status, floorNumber) VALUES
('S100', 'Available', 1),
('S123', 'Available', 1),
('S456', 'Available', 2),
('S789', 'Available', 3);
GO

INSERT INTO DynamicPricing (vehicleType, slotType, startTime, endTime, dayType, demandLevel, pricePerHour) VALUES
('Car', 'Standard', '08:00', '10:00', 'Weekday', 'High', 140),
('Car', 'Standard', '17:00', '20:00', 'Weekday', 'High', 140),
('Car', 'Standard', '10:00', '17:00', 'Weekday', 'Medium', 110),
('Car', 'Standard', '00:00', '23:59', 'Weekend', 'Medium', 120),
('Motorbike', 'Standard', '08:00', '10:00', 'Weekday', 'High', 70),
('Motorbike', 'Standard', '00:00', '23:59', 'Any', 'Low', 50),
('Truck', 'Standard', '00:00', '23:59', 'Any', 'Low', 150),
('EV', 'Standard', '00:00', '23:59', 'Any', 'Low', 120);
GO

--TRIGGERS

CREATE TRIGGER trg_AfterInsertParkingRecord
ON ParkingRecords
AFTER INSERT
AS
BEGIN
UPDATE ParkingSlots
SET status = 'Occupied'
WHERE slotID IN (SELECT slotID FROM inserted);
END;
GO

CREATE TRIGGER trg_AfterUpdateExitTime
ON ParkingRecords
AFTER UPDATE
AS
BEGIN
IF NOT UPDATE(exitTime) RETURN;
UPDATE ParkingSlots
SET status = 'Available'
WHERE slotID IN (SELECT slotID FROM inserted WHERE exitTime IS NOT NULL);
END;
GO

CREATE TRIGGER trg_AfterInsertReservation
ON Reservations
AFTER INSERT
AS
BEGIN
UPDATE ParkingSlots
SET status = 'Reserved'
WHERE slotID IN (SELECT slotID FROM inserted);
END;
GO

CREATE TRIGGER trg_AfterUpdateReservationStatuss
ON Reservations
AFTER UPDATE
AS
BEGIN
IF NOT UPDATE(Status) RETURN;
UPDATE ParkingSlots
SET status = 'Available'
WHERE slotID IN (SELECT slotID FROM inserted WHERE Status IN ('Cancelled','Completed'));
END;
GO

--STORED PROCEDURES

CREATE OR ALTER PROCEDURE RegisterUser
@Name VARCHAR(50),
@Email VARCHAR(100),
@Password VARCHAR(255),
@Role VARCHAR(10) = 'User'
AS
BEGIN
SET NOCOUNT ON;
IF @Role NOT IN ('Admin','User') THROW 50050, 'Role must be Admin or User.', 1;
IF EXISTS (SELECT 1 FROM Users WHERE Email = @Email) THROW 50051, 'Email already registered.', 1;
DECLARE @hash VARCHAR(64) = CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', @Password), 2);
BEGIN TRY
BEGIN TRANSACTION;
INSERT INTO Users (Name, Email, PassHash, Role) VALUES (@Name, @Email, @hash, @Role);
COMMIT;
SELECT 'User registered.' AS Message;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK;
DECLARE @e1 VARCHAR(500) = ERROR_MESSAGE();
THROW 50000, @e1, 1;
END CATCH
END;
GO

CREATE OR ALTER PROCEDURE AddVehicle
@PlateNumber VARCHAR(15),
@VehicleType VARCHAR(20),
@Phone VARCHAR(15),
@userID INT
AS
BEGIN
SET NOCOUNT ON;
IF NOT EXISTS (SELECT 1 FROM Users WHERE userID = @userID) THROW 50001, 'User not found.', 1;
IF NOT EXISTS (SELECT 1 FROM ParkingRates WHERE VehicleType = @VehicleType) THROW 50002, 'Vehicle type not in ParkingRates.', 1;
BEGIN TRY
BEGIN TRANSACTION;
INSERT INTO Vehicles (PlateNumber, VehicleType, Phone, userID)
VALUES (@PlateNumber, @VehicleType, @Phone, @userID);
COMMIT;
SELECT 'Vehicle added successfully.' AS Message;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK;
DECLARE @e2 VARCHAR(500) = ERROR_MESSAGE();
THROW 50000, @e2, 1;
END CATCH
END;
GO

CREATE OR ALTER PROCEDURE VehicleEntry
@PlateNumber VARCHAR(15),
@slotID INT = NULL
AS
BEGIN
SET NOCOUNT ON;
DECLARE @vid INT;
SELECT @vid = vehicleID FROM Vehicles WHERE PlateNumber = @PlateNumber;
IF @vid IS NULL THROW 50020, 'Vehicle not found.', 1;
IF @slotID IS NULL SELECT TOP 1 @slotID = slotID FROM ParkingSlots WHERE status = 'Available' ORDER BY slotID;
IF @slotID IS NULL THROW 50021, 'No available slots.', 1;
IF NOT EXISTS (SELECT 1 FROM ParkingSlots WHERE slotID = @slotID AND status = 'Available') THROW 50022, 'Slot not available.', 1;
BEGIN TRY
BEGIN TRANSACTION;
INSERT INTO ParkingRecords (vehicleID, slotID) VALUES (@vid, @slotID);
COMMIT;
SELECT 'Vehicle entry recorded.' AS Message;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK;
DECLARE @e3 VARCHAR(500) = ERROR_MESSAGE();
THROW 50000, @e3, 1;
END CATCH
END;
GO

CREATE OR ALTER PROCEDURE GenerateBill
@recordID INT,
@paymentMethod VARCHAR(20)
AS
BEGIN
SET NOCOUNT ON;
IF @paymentMethod NOT IN ('Cash','Card','Online') THROW 50040, 'Invalid payment method.', 1;
IF NOT EXISTS (SELECT 1 FROM ParkingRecords WHERE recordID = @recordID AND exitTime IS NULL) THROW 50041, 'Invalid record.', 1;
DECLARE @exit DATETIME = GETDATE();
DECLARE @entry DATETIME;
DECLARE @vehicleType VARCHAR(20);
DECLARE @durationMin INT;
DECLARE @ratePerHour DECIMAL(8,2);
DECLARE @fee DECIMAL(8,2);
DECLARE @dayType VARCHAR(15);
DECLARE @timeOnly TIME;
SELECT @entry = pr.entryTime, @vehicleType = v.VehicleType
FROM ParkingRecords pr JOIN Vehicles v ON pr.vehicleID = v.vehicleID
WHERE pr.recordID = @recordID;
SET @durationMin = DATEDIFF(MINUTE, @entry, @exit);
IF @durationMin < 1 SET @durationMin = 1;
SET @timeOnly = CAST(@entry AS TIME);
SET @dayType = CASE WHEN DATEPART(WEEKDAY, @entry) IN (1,7) THEN 'Weekend' ELSE 'Weekday' END;
SELECT TOP 1 @ratePerHour = pricePerHour
FROM DynamicPricing
WHERE vehicleType = @vehicleType
AND @timeOnly >= startTime
AND @timeOnly < endTime
AND dayType IN (@dayType, 'Any')
ORDER BY CASE WHEN dayType = @dayType THEN 0 ELSE 1 END;
IF @ratePerHour IS NULL SELECT @ratePerHour = PricePerHour FROM ParkingRates WHERE VehicleType = @vehicleType;
IF @ratePerHour IS NULL SET @ratePerHour = 0;
SET @fee = ROUND((@durationMin / 60.0) * @ratePerHour, 2);
BEGIN TRY
BEGIN TRANSACTION;
UPDATE ParkingRecords SET exitTime = @exit WHERE recordID = @recordID;
INSERT INTO Payments (recordID, Amount, PaymentMethod, Status)
VALUES (@recordID, @fee, @paymentMethod, 'Paid');
COMMIT;
SELECT 'Bill generated.' AS Message, @durationMin AS DurationMinutes, @ratePerHour AS RatePerHour, @fee AS TotalFee;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK;
DECLARE @e6 VARCHAR(500) = ERROR_MESSAGE();
THROW 50000, @e6, 1;
END CATCH
END;
GO
