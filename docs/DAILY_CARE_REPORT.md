# Daily Care Report

A standardized, clinical summary report designed for sharing with family members, nurses, and care professionals.

## Purpose

Generate a clean, shareable daily summary (PDF or electronic) that allows a nurse or family member to understand today's care status in under 60 seconds.

## Access

- **Support Tab** → Quick Action → "Share today's summary/plan/important updates"
- Route: `/daily-care-report`

## Report Structure

### Header
- Patient name
- Date and time generated
- Caregiver name (Prepared by)

### Today at a Glance
Overview of daily completion status:
- Medications: X of Y taken
- Vitals: Recorded / Not recorded
- Meals: X logged
- Appointments today: X

### Medications
For each medication:
- Name and dose
- Scheduled time slot
- Status: TAKEN (with timestamp) / MISSED / PENDING

### Vitals
For each recorded vital:
- Type (Blood Pressure, Heart Rate, Temperature, etc.)
- Value with unit
- Time recorded
- Range indicator: "Within usual range" or "Outside usual range"

### Appointments
Today and upcoming appointments:
- Type/specialty
- Provider name
- Date and time
- TODAY badge for same-day appointments

### Caregiver Notes
Brief observations logged today:
- Timestamp
- Note text

### Care Team Activity
Who logged what today:
- Time
- Person
- Action taken

### Footer
- Privacy statement confirming intentional sharing
- Controlled access notice
- Report ID for reference

## Share Options

1. **Share as PDF** (Primary)
   - Print-friendly format
   - Single-column layout
   - Professional styling

2. **Share as Text**
   - Plain text format
   - Suitable for messaging apps
   - ASCII dividers for sections

3. **Print**
   - Direct print to connected printer

## Design Constraints

- PDF-first, print-friendly
- Single-column, skimmable layout
- No charts or graphs
- No emojis
- No AI commentary
- No celebratory language
- Clinical, professional tone

## Range Definitions

### Blood Pressure
- Normal: Systolic < 130 AND Diastolic < 80

### Heart Rate
- Normal: 60-100 bpm

### Temperature
- Normal: 97.0-99.0°F

### Oxygen Saturation
- Normal: ≥ 95%

## Technical Implementation

- Uses `expo-print` for PDF generation
- Uses `expo-sharing` for share functionality
- HTML template for PDF styling
- Plain text generator for messaging

## Privacy

The report includes a footer privacy notice:

> This report was intentionally shared by the primary caregiver. Access to care information is controlled and limited to authorized family members and care professionals only.
