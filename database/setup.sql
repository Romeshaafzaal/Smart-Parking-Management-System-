IF EXISTS (SELECT name FROM sys.databases WHERE name = 'smartParkingSystemFinal')
DROP DATABASE smartParkingSystemFinal;
GO
CREATE DATABASE smartParkingSystemFinal;
GO
USE smartParkingSystemFinal;
GO
CREATE TABLE users (
userID INT IDENTITY(1,1) PRIMARY KEY,
name VARCHAR(50) NOT NULL,
email VARCHAR(100) NOT NULL UNIQUE,
password VARCHAR(64) NOT NULL,
role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
createdAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO
CREATE TABLE vehicles (
vehicleID INT IDENTITY(1,1) PRIMARY KEY,
plateNumber VARCHAR(15) NOT NULL UNIQUE,
vehicleType VARCHAR(20) NOT NULL DEFAULT 'Car',
ownerName VARCHAR(50) NULL,
phone VARCHAR(15) NULL,
userID INT NULL FOREIGN KEY REFERENCES users(userID) ON DELETE SET NULL
);
GO
CREATE TABLE parking_slots (
slotID INT IDENTITY(1,1) PRIMARY KEY,
slotNumber VARCHAR(10) NOT NULL UNIQUE,
status VARCHAR(10) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','Occupied','Reserved')),
isReserved BIT NOT NULL DEFAULT 0,
floorNumber INT NOT NULL DEFAULT 1
);
GO
select * from parking_slots;
select * from vehicles;
CREATE TABLE rates (
rateID INT IDENTITY(1,1) PRIMARY KEY,
vehicleType VARCHAR(20) NOT NULL UNIQUE,
pricePerHour DECIMAL(6,2) NOT NULL CHECK (pricePerHour > 0)
);
GO
CREATE TABLE parking_records (
recordID INT IDENTITY(1,1) PRIMARY KEY,
vehicleID INT NOT NULL FOREIGN KEY REFERENCES vehicles(vehicleID),
slotID INT NOT NULL FOREIGN KEY REFERENCES parking_slots(slotID),
entryTime DATETIME NOT NULL DEFAULT GETDATE(),
exitTime DATETIME NULL,
fee DECIMAL(8,2) NULL
);
GO
CREATE TABLE payments (
paymentID INT IDENTITY(1,1) PRIMARY KEY,
recordID INT NULL FOREIGN KEY REFERENCES parking_records(recordID),
reservationID INT NULL,
fineID INT NULL,
amount DECIMAL(8,2) NOT NULL,
paymentMethod VARCHAR(20) NOT NULL DEFAULT 'Cash' CHECK (paymentMethod IN ('Cash','Card','Online','Pending')),
paymentTime DATETIME NOT NULL DEFAULT GETDATE(),
status VARCHAR(15) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Paid','Failed'))
);
GO
CREATE TABLE reservations (
reservationID INT IDENTITY(1,1) PRIMARY KEY,
vehicleID INT NOT NULL FOREIGN KEY REFERENCES vehicles(vehicleID),
slotID INT NOT NULL FOREIGN KEY REFERENCES parking_slots(slotID),
userID INT NULL FOREIGN KEY REFERENCES users(userID) ON DELETE SET NULL,
startTime DATETIME NOT NULL,
endTime DATETIME NOT NULL,
status VARCHAR(15) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Cancelled','Completed')),
CONSTRAINT CK_ReservationTime CHECK (endTime > startTime)
);
GO
ALTER TABLE payments
ADD CONSTRAINT FK_payments_reservations
FOREIGN KEY (reservationID) REFERENCES reservations(reservationID);
GO
CREATE TABLE fines (
fineID INT IDENTITY(1,1) PRIMARY KEY,
recordID INT NULL FOREIGN KEY REFERENCES parking_records(recordID),
userID INT NULL FOREIGN KEY REFERENCES users(userID) ON DELETE SET NULL,
vehicleID INT NULL FOREIGN KEY REFERENCES vehicles(vehicleID),
reason VARCHAR(100) NOT NULL,
amount DECIMAL(8,2) NOT NULL CHECK (amount > 0),
issuedAt DATETIME NOT NULL DEFAULT GETDATE(),
status VARCHAR(15) NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Unpaid','Paid'))
);
GO
ALTER TABLE payments
ADD CONSTRAINT FK_payments_fines
FOREIGN KEY (fineID) REFERENCES fines(fineID);
GO
CREATE TABLE dynamic_pricing (
pricingID INT IDENTITY(1,1) PRIMARY KEY,
vehicleType VARCHAR(20) NOT NULL,
slotType VARCHAR(20) NOT NULL DEFAULT 'Standard',
startTime TIME NOT NULL,
endTime TIME NOT NULL,
dayType VARCHAR(15) NOT NULL CHECK (dayType IN ('Weekday','Weekend','Any')),
demandLevel VARCHAR(10) NOT NULL CHECK (demandLevel IN ('Low','Medium','High')),
pricePerHour DECIMAL(8,2) NOT NULL CHECK (pricePerHour > 0),
CONSTRAINT UQ_DynamicPricing UNIQUE (vehicleType, slotType, dayType, startTime, endTime)
);
GO
CREATE TABLE analytics (
analyticsID INT IDENTITY(1,1) PRIMARY KEY,
reportDate DATE NOT NULL UNIQUE,
totalVehicles INT NOT NULL DEFAULT 0,
totalRevenue DECIMAL(10,2) NOT NULL DEFAULT 0,
peakHour VARCHAR(20) NULL,
occupancyRate FLOAT NULL,
evUsageCount INT NOT NULL DEFAULT 0,
vipUsageCount INT NOT NULL DEFAULT 0,
generatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO
INSERT INTO users (name, email, password, role) VALUES
('Romesha Afzaal', 'romesha@gmail.com', CONVERT(VARCHAR(64), HASHBYTES('SHA2_256','pass'), 2), 'user'),
('Minahil Basalat','minahil@gmail.com', CONVERT(VARCHAR(64), HASHBYTES('SHA2_256','pass'), 2), 'user'),
('Aliza Nadeem', 'aliza@gmail.com', CONVERT(VARCHAR(64), HASHBYTES('SHA2_256','pass'), 2), 'user'),
('Iman', 'iman@gmail.com', CONVERT(VARCHAR(64), HASHBYTES('SHA2_256','admin'), 2), 'admin');
GO
INSERT INTO rates (vehicleType, pricePerHour) VALUES
('Car', 100),
('Motorbike', 50),
('Truck', 150),
('EV', 120);
GO
INSERT INTO vehicles (plateNumber, vehicleType, ownerName, phone, userID) VALUES
('LEA5397', 'Car', 'Romesha Afzaal', '03001234567', 1),
('LEB1234', 'Motorbike','Minahil Basalat', '03337654321', 2),
('LEC0000', 'Car', 'Aliza Nadeem', '03009876543', 3);
GO
INSERT INTO parking_slots (slotNumber, status, isReserved, floorNumber) VALUES
('S100', 'Available', 0, 1),
('S123', 'Available', 0, 1),
('S456', 'Available', 0, 2),
('S789', 'Available', 0, 2),
('S901', 'Available', 0, 3),
('S902', 'Available', 0, 3);
GO
INSERT INTO dynamic_pricing (vehicleType, slotType, startTime, endTime, dayType, demandLevel, pricePerHour) VALUES
('Car', 'Standard', '08:00', '10:00', 'Weekday', 'High', 140),
('Car', 'Standard', '17:00', '20:00', 'Weekday', 'High', 140),
('Car', 'Standard', '10:00', '17:00', 'Weekday', 'Medium', 110),
('Car', 'Standard', '00:00', '23:59', 'Weekend', 'Medium', 120),
('Motorbike','Standard', '08:00', '10:00', 'Weekday', 'High', 70),
('Motorbike','Standard', '00:00', '23:59', 'Any', 'Low', 50),
('Truck', 'Standard', '00:00', '23:59', 'Any', 'Low', 150),
('EV', 'Standard', '00:00', '23:59', 'Any', 'Low', 120);
GO
CREATE TRIGGER trg_AfterInsertParkingRecord
ON parking_records
AFTER INSERT
AS
BEGIN
SET NOCOUNT ON;
UPDATE parking_slots
SET status = 'Occupied', isReserved = 0
WHERE slotID IN (SELECT slotID FROM inserted);
END;
GO
CREATE TRIGGER trg_AfterUpdateExitTime
ON parking_records
AFTER UPDATE
AS
BEGIN
SET NOCOUNT ON;
IF NOT UPDATE(exitTime) RETURN;
UPDATE parking_slots
SET status = 'Available', isReserved = 0
WHERE slotID IN (SELECT slotID FROM inserted WHERE exitTime IS NOT NULL);
END;
GO
CREATE TRIGGER trg_AfterInsertReservation
ON reservations
AFTER INSERT
AS
BEGIN
SET NOCOUNT ON;
UPDATE parking_slots
SET status = 'Reserved', isReserved = 1
WHERE slotID IN (SELECT slotID FROM inserted);
END;
GO
CREATE TRIGGER trg_AfterUpdateReservationStatus
ON reservations
AFTER UPDATE
AS
BEGIN
SET NOCOUNT ON;
IF NOT UPDATE(status) RETURN;
UPDATE parking_slots
SET status = 'Available', isReserved = 0
WHERE slotID IN (SELECT slotID FROM inserted WHERE status IN ('Cancelled','Completed'));
END;
GO
CREATE TRIGGER trg_AfterPaymentPaid
ON payments
AFTER UPDATE
AS
BEGIN
SET NOCOUNT ON;
IF NOT UPDATE(status) RETURN;
DECLARE @today DATE = CAST(GETDATE() AS DATE);
DECLARE @rev DECIMAL(10,2);
SELECT @rev = SUM(amount) FROM payments WHERE status = 'Paid' AND CAST(paymentTime AS DATE) = @today;
DECLARE @vehicles INT;
SELECT @vehicles = COUNT(*) FROM parking_records WHERE CAST(entryTime AS DATE) = @today;
IF EXISTS (SELECT 1 FROM analytics WHERE reportDate = @today)
UPDATE analytics SET totalRevenue = ISNULL(@rev,0), totalVehicles = ISNULL(@vehicles,0) WHERE reportDate = @today;
ELSE
INSERT INTO analytics (reportDate, totalRevenue, totalVehicles) VALUES (@today, ISNULL(@rev,0), ISNULL(@vehicles,0));
END;
GO
CREATE TRIGGER trg_PreventDoubleBooking
ON reservations
INSTEAD OF INSERT
AS
BEGIN
SET NOCOUNT ON;
IF EXISTS (
SELECT 1 FROM inserted i
JOIN reservations r ON r.slotID = i.slotID
WHERE r.status = 'Active'
AND i.startTime < r.endTime
AND i.endTime > r.startTime
)
BEGIN
RAISERROR('Slot is already reserved for that time period.', 16, 1);
RETURN;
END;
INSERT INTO reservations (vehicleID, slotID, userID, startTime, endTime, status)
SELECT vehicleID, slotID, userID, startTime, endTime, status FROM inserted;
END;
GO
DROP TRIGGER IF EXISTS trg_PreventDoubleBooking;
GO
CREATE OR ALTER PROCEDURE sp_RegisterUser
@name VARCHAR(50),
@email VARCHAR(100),
@password VARCHAR(255),
@role VARCHAR(10) = 'user'
AS
BEGIN
SET NOCOUNT ON;
IF @role NOT IN ('admin','user') THROW 50050, 'Role must be admin or user.', 1;
IF EXISTS (SELECT 1 FROM users WHERE email = @email) THROW 50051, 'Email already registered.', 1;
DECLARE @hash VARCHAR(64) = CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', @password), 2);
BEGIN TRY
BEGIN TRANSACTION;
INSERT INTO users (name, email, password, role) VALUES (@name, @email, @hash, @role);
COMMIT;
SELECT 'User registered.' AS Message, SCOPE_IDENTITY() AS userID;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK;
DECLARE @err1 VARCHAR(500) = ERROR_MESSAGE();
THROW 50000, @err1, 1;
END CATCH
END;
GO
CREATE OR ALTER PROCEDURE sp_LoginUser
@email VARCHAR(100),
@password VARCHAR(255)
AS
BEGIN
SET NOCOUNT ON;
DECLARE @hash VARCHAR(64) = CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', @password), 2);
SELECT userID, name, email, role, createdAt
FROM users
WHERE email = @email AND password = @hash;
END;
GO
CREATE OR ALTER PROCEDURE sp_VehicleEntry
@vehicleID INT,
@slotID INT = NULL
AS
BEGIN
SET NOCOUNT ON;
IF NOT EXISTS (SELECT 1 FROM vehicles WHERE vehicleID = @vehicleID) THROW 50001, 'Vehicle not found.', 1;
IF @slotID IS NULL
SELECT TOP 1 @slotID = slotID FROM parking_slots WHERE status = 'Available' ORDER BY slotID;
IF @slotID IS NULL THROW 50002, 'No available slots.', 1;
IF NOT EXISTS (SELECT 1 FROM parking_slots WHERE slotID = @slotID AND status = 'Available') THROW 50003, 'Slot not available.', 1;
BEGIN TRY
BEGIN TRANSACTION;
INSERT INTO parking_records (vehicleID, slotID) VALUES (@vehicleID, @slotID);
SELECT 'Vehicle entry recorded.' AS Message, SCOPE_IDENTITY() AS recordID;
COMMIT;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK;
DECLARE @e1 VARCHAR(500) = ERROR_MESSAGE();
THROW 50000, @e1, 1;
END CATCH
END;
GO
CREATE OR ALTER PROCEDURE sp_GenerateBill
@recordID INT,
@paymentMethod VARCHAR(20) = 'Cash'
AS
BEGIN
SET NOCOUNT ON;
IF @paymentMethod NOT IN ('Cash','Card','Online') THROW 50010, 'Invalid payment method.', 1;
IF NOT EXISTS (SELECT 1 FROM parking_records WHERE recordID = @recordID AND exitTime IS NULL)
THROW 50011, 'Record not found or already checked out.', 1;
DECLARE @exit DATETIME = GETDATE();
DECLARE @entry DATETIME;
DECLARE @vehicleType VARCHAR(20);
DECLARE @durationMin INT;
DECLARE @rate DECIMAL(8,2);
DECLARE @fee DECIMAL(8,2);
DECLARE @dayType VARCHAR(15);
DECLARE @timeOnly TIME;
SELECT @entry = pr.entryTime, @vehicleType = v.vehicleType
FROM parking_records pr JOIN vehicles v ON pr.vehicleID = v.vehicleID
WHERE pr.recordID = @recordID;
SET @durationMin = DATEDIFF(MINUTE, @entry, @exit);
IF @durationMin < 1 SET @durationMin = 1;
SET @timeOnly = CAST(@entry AS TIME);
SET @dayType = CASE WHEN DATEPART(WEEKDAY, @entry) IN (1,7) THEN 'Weekend' ELSE 'Weekday' END;
SELECT TOP 1 @rate = pricePerHour
FROM dynamic_pricing
WHERE vehicleType = @vehicleType
AND @timeOnly >= startTime AND @timeOnly < endTime
AND dayType IN (@dayType, 'Any')
ORDER BY CASE WHEN dayType = @dayType THEN 0 ELSE 1 END;
IF @rate IS NULL SELECT @rate = pricePerHour FROM rates WHERE vehicleType = @vehicleType;
IF @rate IS NULL SET @rate = 100;
SET @fee = ROUND((@durationMin / 60.0) * @rate, 2);
BEGIN TRY
BEGIN TRANSACTION;
UPDATE parking_records SET exitTime = @exit, fee = @fee WHERE recordID = @recordID;
INSERT INTO payments (recordID, amount, paymentMethod, status)
VALUES (@recordID, @fee, @paymentMethod, 'Paid');
COMMIT;
SELECT 'Bill generated.' AS Message, @durationMin AS DurationMinutes, @rate AS RatePerHour, @fee AS TotalFee;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK;
DECLARE @e2 VARCHAR(500) = ERROR_MESSAGE();
THROW 50000, @e2, 1;
END CATCH
END;
GO
CREATE OR ALTER PROCEDURE sp_CreateReservation
@vehicleID INT,
@slotID INT,
@userID INT,
@startTime DATETIME,
@endTime DATETIME,
@paymentMethod VARCHAR(20) = 'Pending'
AS
BEGIN
SET NOCOUNT ON;
IF @endTime <= @startTime THROW 50020, 'End time must be after start time.', 1;
IF NOT EXISTS (SELECT 1 FROM parking_slots WHERE slotID = @slotID AND status = 'Available') THROW 50021, 'Slot not available.', 1;
DECLARE @hours INT = CEILING(DATEDIFF(MINUTE, @startTime, @endTime) / 60.0);
IF @hours < 1 SET @hours = 1;
DECLARE @vehicleType VARCHAR(20);
SELECT @vehicleType = vehicleType FROM vehicles WHERE vehicleID = @vehicleID;
DECLARE @rate DECIMAL(8,2);
SELECT @rate = pricePerHour FROM rates WHERE vehicleType = @vehicleType;
IF @rate IS NULL SET @rate = 100;
DECLARE @fee DECIMAL(8,2) = @hours * @rate;
DECLARE @payStatus VARCHAR(15) = CASE WHEN @paymentMethod IN ('Cash','Card','Online') THEN 'Paid' ELSE 'Pending' END;
BEGIN TRY
BEGIN TRANSACTION;
UPDATE parking_slots SET status = 'Reserved', isReserved = 1 WHERE slotID = @slotID;
INSERT INTO reservations (vehicleID, slotID, userID, startTime, endTime, status)
VALUES (@vehicleID, @slotID, @userID, @startTime, @endTime, 'Active');
DECLARE @resID INT = SCOPE_IDENTITY();
INSERT INTO payments (reservationID, amount, paymentMethod, status)
VALUES (@resID, @fee, @paymentMethod, @payStatus);
COMMIT;
SELECT 'Reservation created.' AS Message, @resID AS reservationID, @fee AS TotalFee;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK;
DECLARE @e3 VARCHAR(500) = ERROR_MESSAGE();
THROW 50000, @e3, 1;
END CATCH
END;
GO
    
CREATE OR ALTER PROCEDURE sp_GenerateDailyAnalytics
@targetDate DATE = NULL
AS
BEGIN
SET NOCOUNT ON;
IF @targetDate IS NULL SET @targetDate = CAST(GETDATE() AS DATE);
DECLARE @totalVehicles INT;
DECLARE @totalRevenue DECIMAL(10,2);
DECLARE @peakHour VARCHAR(20);
DECLARE @occupancyRate FLOAT;
DECLARE @evUsage INT;
SELECT @totalVehicles = COUNT(*) FROM parking_records WHERE CAST(entryTime AS DATE) = @targetDate;
SELECT @totalRevenue = ISNULL(SUM(amount),0) FROM payments WHERE status='Paid' AND CAST(paymentTime AS DATE) = @targetDate;
SELECT TOP 1 @peakHour = CAST(DATEPART(HOUR, entryTime) AS VARCHAR) + ':00'
FROM parking_records WHERE CAST(entryTime AS DATE) = @targetDate
GROUP BY DATEPART(HOUR, entryTime) ORDER BY COUNT(*) DESC;
DECLARE @totalSlots INT; SELECT @totalSlots = COUNT(*) FROM parking_slots;
SET @occupancyRate = CASE WHEN @totalSlots > 0 THEN (CAST(@totalVehicles AS FLOAT) / @totalSlots) * 100 ELSE 0 END;
SELECT @evUsage = COUNT(*) FROM parking_records pr JOIN vehicles v ON pr.vehicleID = v.vehicleID
WHERE v.vehicleType = 'EV' AND CAST(pr.entryTime AS DATE) = @targetDate;
IF EXISTS (SELECT 1 FROM analytics WHERE reportDate = @targetDate)
UPDATE analytics SET totalVehicles=@totalVehicles, totalRevenue=@totalRevenue,
peakHour=@peakHour, occupancyRate=@occupancyRate, evUsageCount=@evUsage, generatedAt=GETDATE()
WHERE reportDate = @targetDate;
ELSE
INSERT INTO analytics (reportDate, totalVehicles, totalRevenue, peakHour, occupancyRate, evUsageCount)
VALUES (@targetDate, @totalVehicles, @totalRevenue, @peakHour, @occupancyRate, @evUsage);
SELECT * FROM analytics WHERE reportDate = @targetDate;
END;
GO
    
CREATE OR ALTER PROCEDURE sp_IssueFine
@recordID INT = NULL,
@userID INT = NULL,
@vehicleID INT = NULL,
@reason VARCHAR(100),
@amount DECIMAL(8,2)
AS
BEGIN
SET NOCOUNT ON;
IF @reason IS NULL OR @amount IS NULL THROW 50030, 'Reason and amount are required.', 1;
BEGIN TRY
BEGIN TRANSACTION;

INSERT INTO fines (recordID, userID, vehicleID, reason, amount)
VALUES (@recordID, @userID, @vehicleID, @reason, @amount);
SELECT 'Fine issued.' AS Message, SCOPE_IDENTITY() AS fineID;
COMMIT;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK;
DECLARE @e4 VARCHAR(500) = ERROR_MESSAGE();
THROW 50000, @e4, 1;
END CATCH
END;
GO
    
CREATE OR ALTER VIEW vw_ActiveParkingRecords AS
SELECT
pr.recordID,
pr.entryTime,
v.vehicleID,
v.plateNumber,
v.vehicleType,
v.ownerName,
ps.slotNumber,
ps.floorNumber,
u.name AS userName,
u.email AS userEmail
FROM parking_records pr
JOIN vehicles v ON pr.vehicleID = v.vehicleID
JOIN parking_slots ps ON pr.slotID = ps.slotID
LEFT JOIN users u ON v.userID = u.userID
WHERE pr.exitTime IS NULL;
GO
    
CREATE OR ALTER VIEW vw_SlotOccupancySummary AS
SELECT
floorNumber,
COUNT(*) AS totalSlots,
SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS availableSlots,
SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) AS occupiedSlots,
SUM(CASE WHEN status = 'Reserved' THEN 1 ELSE 0 END) AS reservedSlots,
CAST(SUM(CASE WHEN status='Available' THEN 1.0 ELSE 0 END)
/ COUNT(*) * 100 AS DECIMAL(5,2)) AS availabilityPct
FROM parking_slots
GROUP BY floorNumber;
GO
    
CREATE OR ALTER VIEW vw_PaymentHistory AS
SELECT
p.paymentID,
p.amount,
p.paymentMethod,
p.status,
p.paymentTime,
p.recordID,
p.reservationID,
p.fineID,
COALESCE(vr.plateNumber, vres.plateNumber, vf.plateNumber) AS plateNumber,
COALESCE(ur.name, ures.name, uf.name) AS userName,
COALESCE(ur.userID, ures.userID, uf.userID) AS userID,
CASE
WHEN p.fineID IS NOT NULL THEN 'Fine'
WHEN p.reservationID IS NOT NULL THEN 'Reservation'
ELSE 'Parking'
END AS paymentType
FROM payments p
LEFT JOIN parking_records rc ON p.recordID = rc.recordID
LEFT JOIN vehicles vr ON rc.vehicleID = vr.vehicleID
LEFT JOIN users ur ON vr.userID = ur.userID
LEFT JOIN reservations rs ON p.reservationID = rs.reservationID
LEFT JOIN vehicles vres ON rs.vehicleID = vres.vehicleID
LEFT JOIN users ures ON rs.userID = ures.userID
LEFT JOIN fines fi ON p.fineID = fi.fineID
LEFT JOIN vehicles vf ON fi.vehicleID = vf.vehicleID
LEFT JOIN users uf ON fi.userID = uf.userID;
GO
    
CREATE OR ALTER VIEW vw_RevenueByVehicleType AS
SELECT
v.vehicleType,
COUNT(DISTINCT pr.recordID) AS totalSessions,
SUM(ISNULL(pr.fee, 0)) AS totalRevenue,
AVG(ISNULL(pr.fee, 0)) AS avgFee
FROM parking_records pr
JOIN vehicles v ON pr.vehicleID = v.vehicleID
WHERE pr.exitTime IS NOT NULL
GROUP BY v.vehicleType;
GO
    
CREATE OR ALTER VIEW vw_UserSummary AS
SELECT
u.userID,
u.name,
u.email,
u.role,
u.createdAt,
COUNT(DISTINCT v.vehicleID) AS vehicleCount,
COUNT(DISTINCT pr.recordID) AS totalParking,
ISNULL(SUM(p.amount), 0) AS totalPaid
FROM users u
LEFT JOIN vehicles v ON u.userID = v.userID
LEFT JOIN parking_records pr ON v.vehicleID = pr.vehicleID
LEFT JOIN payments p ON pr.recordID = p.recordID AND p.status = 'Paid'
GROUP BY u.userID, u.name, u.email, u.role, u.createdAt;
GO
SELECT * FROM parking_slots WHERE status = 'Available';
SELECT v.plateNumber, v.vehicleType, v.ownerName, u.name AS registeredUser
FROM vehicles v
LEFT JOIN users u ON v.userID = u.userID;
SELECT paymentMethod, SUM(amount) AS TotalRevenue, COUNT(*) AS TotalTransactions
FROM payments WHERE status = 'Paid'
GROUP BY paymentMethod
ORDER BY TotalRevenue DESC;
SELECT v.plateNumber, pr.fee
FROM parking_records pr
JOIN vehicles v ON pr.vehicleID = v.vehicleID
WHERE pr.fee > (SELECT AVG(fee) FROM parking_records WHERE fee IS NOT NULL);
SELECT slotID, COUNT(*) AS usageCount
FROM parking_records
GROUP BY slotID
HAVING COUNT(*) > 0
ORDER BY usageCount DESC;
SELECT vehicleType FROM vehicles
UNION
SELECT vehicleType FROM rates;
SELECT vehicleType FROM vehicles
INTERSECT
SELECT vehicleType FROM rates;
SELECT vehicleType FROM vehicles
EXCEPT
SELECT vehicleType FROM rates;
SELECT u.name, v.plateNumber
FROM users u
FULL OUTER JOIN vehicles v ON u.userID = v.userID;
SELECT * FROM vehicles WHERE plateNumber LIKE 'LE%';
SELECT v.plateNumber, MAX(pr.entryTime) AS lastEntry
FROM parking_records pr
JOIN vehicles v ON pr.vehicleID = v.vehicleID
GROUP BY v.plateNumber
ORDER BY lastEntry DESC;
GO
select *from Users;
select *from fines;
