Smart Parking Management System 🚗
📌 Project Description

The Smart Parking Management System is a web-based application designed to automate and streamline parking operations. It manages vehicle entry/exit, slot allocation, reservations, billing, fines, and analytics using a structured database and backend logic. The system reduces manual effort, prevents double booking, and provides real-time parking insights.

🚨 Problem Statement

Manual parking systems are inefficient and error-prone, leading to issues such as double booking, poor record management, and lack of real-time availability tracking.

🎯 Purpose

To provide an automated and reliable solution for managing parking slots, vehicle records, reservations, payments, fines, and reporting in an efficient and scalable way.

📦 Features
User authentication (registration & login with role-based access)
Vehicle entry and exit management
Real-time parking slot allocation
Advance reservation system with conflict prevention
Automated billing with dynamic pricing
Fine management system
Analytics and reporting (revenue, occupancy, peak hours)
Automated updates using triggers and stored procedures
🛠 Tech Stack
Frontend: React (Vite), JavaScript
Backend: Node.js
Database: Microsoft SQL Server
🗄 Database Overview

The system uses a normalized relational database (BCNF) with the following main tables:

users – user information
vehicles – vehicle details linked to users
parking_slots – slot status and management
parking_records – entry/exit logs
reservations – advance bookings
payments – transaction records
fines – penalty management
rates – pricing per vehicle type
dynamic_pricing – time/demand-based pricing
analytics – aggregated system reports
⚙️ Database Logic
Stored Procedures
sp_RegisterUser – user registration with validation
sp_LoginUser – authentication
sp_VehicleEntry – assigns slot and creates parking record
sp_GenerateBill – calculates parking fee and processes payment
sp_CreateReservation – handles slot booking
sp_GenerateDailyAnalytics – generates daily reports
sp_IssueFine – issues fines
Triggers
Auto-update slot status on vehicle entry/exit
Prevent double booking of slots
Update analytics after payments
Manage reservation status changes
Views
Active parking records
Slot occupancy summary
Payment history
Revenue by vehicle type
User summary

🎥 Demo
Here is a demo video of the project showing its main features and working:
▶️ Watch the video:
https://drive.google.com/file/d/1_PcqTFje4IfbxjXNEAciGj1tRc7kkO3m/view?usp=sharing


📊 Key Impact
Reduces manual parking management effort
Prevents slot conflicts and errors
Enables real-time tracking and reporting
Improves efficiency and user experience
