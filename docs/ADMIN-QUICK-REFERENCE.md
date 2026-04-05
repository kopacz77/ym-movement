# Admin Quick Reference - Payments & Pricing

**Everything you need to know about how payments work now**

## ✅ What's Fixed (As of October 21, 2025)

1. **All lessons automatically create payment records** (no more missing payments!)
2. **Prices are based on lesson duration** (30min lessons cost half of 60min)
3. **Custom student pricing works correctly**
4. **Payments page shows ALL students** (not just student-booked lessons)

## 🎯 How Pricing Works

### Simple Rule: **Price = (Hourly Rate ÷ 60) × Minutes**

### Examples:

**30-Minute Private Lesson:**
- Hourly Rate: $120
- Calculation: $120 ÷ 60 × 30 = **$60**

**45-Minute Choreography:**
- Hourly Rate: $150
- Calculation: $150 ÷ 60 × 45 = **$112.50**

**60-Minute Competition Prep:**
- Hourly Rate: $180
- Calculation: $180 ÷ 60 × 60 = **$180**

## 📊 Quick Pricing Chart

### Default Rates (Students Without Custom Pricing)

| Duration | Private | Choreography | Group | Comp Prep |
|----------|---------|--------------|-------|-----------|
| **30 min** | $60 | $75 | $40 | $90 |
| **45 min** | $90 | $112.50 | $60 | $135 |
| **60 min** | $120 | $150 | $80 | $180 |

### Students with Custom Pricing

**Example: Student with $100/hr private rate**

| Duration | Their Price | Default Price |
|----------|-------------|---------------|
| **30 min** | $50 | $60 |
| **45 min** | $75 | $90 |
| **60 min** | $100 | $120 |

## 🔄 When You Assign a Student

**What Happens Automatically:**

1. ✅ System calculates correct price based on time slot duration
2. ✅ Lesson record created with that price
3. ✅ Payment record created with same price
4. ✅ Google Calendar event created
5. ✅ Student gets notification
6. ✅ Payment shows up in Payments page **immediately**

**You Don't Need To:**
- ❌ Manually create payment
- ❌ Calculate the price yourself
- ❌ Do anything extra!

## 💰 Payments Page

### What You'll See

**For Every Lesson:**
- Student Name
- Lesson Date & Time
- Lesson Type (Private, Choreography, etc.)
- Amount (automatically calculated)
- Status (Pending/Paid)
- Payment Method (Venmo/Zelle)

### What You Can Do

1. **View all payments** - admin-assigned AND student-booked
2. **Mark as paid** - when student pays you
3. **Send reminders** - automated emails to students
4. **Filter by status** - see only pending or only paid
5. **Search by name** - find specific student

## 👥 Custom Student Pricing

### When to Use It

- Student has negotiated rate
- Family discount
- Scholarship student
- Special arrangement

### How to Set It Up

1. Go to **Students** page
2. Click **Edit** on the student
3. Enable **Custom Pricing**
4. Set rates for each lesson type:
   - Private Lessons
   - Choreography
   - Group Lessons
   - Competition Prep
5. Click **Save**

### How It Works

**Example:**
- You set Alice's private rate to $100/hr
- You assign her to a 30-minute slot
- System automatically charges $50 (not $60)
- Payment record shows $50

## 🔍 Checking Everything is Working

### Quick Test (Do This Once)

1. **Create a 30-minute time slot**
   - Start: 2:00 PM
   - End: 2:30 PM

2. **Assign a student (no custom pricing)**
   - Lesson type: Private

3. **Check the results:**
   - Lesson price should be **$60**
   - Go to Payments page
   - Should see payment for **$60**
   - Status: **PENDING**

✅ If you see this, everything is working!

## ⚠️ If Something Seems Wrong

### Run This Command (in terminal):
```bash
npx tsx scripts/check-payments-and-pricing.ts
```

**Should show:**
- Lessons WITHOUT payment records: **0**
- Pricing Issues: **0**

### If Issues Found, Run This:
```bash
npx tsx scripts/fix-existing-payments-and-pricing.ts
```

This will fix any problems automatically.

## 📱 Mobile vs Desktop

**Everything works the same way!**
- Desktop: Full sidebar navigation
- Mobile: Week view shows 7 days at a time
- Both create payments correctly
- Both calculate prices the same

## 🎓 Common Scenarios

### Scenario 1: Assigning Multiple Students Same Day

**What You Do:**
1. Assign Student A to 2:00 PM - 2:30 PM slot (Private)
2. Assign Student B to 3:00 PM - 4:00 PM slot (Private)
3. Assign Student C to 4:15 PM - 4:45 PM slot (Choreography)

**What Happens:**
- Student A: $60 payment created
- Student B: $120 payment created
- Student C: $112.50 payment created
- All three show in Payments page

### Scenario 2: Changing Lesson Type

**What You Do:**
1. Find existing 30-min Private lesson ($60)
2. Click pencil icon to edit
3. Change to Choreography
4. Click Save

**What Happens:**
- Lesson type updates to Choreography
- Price recalculates: $75 (30min at $150/hr)
- Payment amount updates to $75
- Google Calendar updates
- Student gets notification

### Scenario 3: Student with Custom Pricing

**Setup:**
- Student "Sarah" has custom private rate: $110/hr

**What You Do:**
1. Assign Sarah to 30-minute private slot

**What Happens:**
- System sees Sarah has custom pricing
- Calculates: $110 ÷ 60 × 30 = $55
- Creates lesson at $55
- Creates payment for $55
- NOT the default $60

## ✅ Summary - What You Need to Know

1. **Every lesson automatically creates a payment** ✅
2. **Prices match the lesson duration** ✅
3. **30-minute lessons cost half of 60-minute** ✅
4. **Custom student pricing is honored** ✅
5. **Payments page shows everyone** ✅
6. **You don't have to do anything special** ✅

## 📞 Still Have Questions?

For technical details, review the API documentation in [API.md](API.md) and the lesson type feature documentation in [LESSON-TYPE-FEATURE.md](LESSON-TYPE-FEATURE.md).

---

**Last Updated:** October 21, 2025
**Status:** All systems working correctly ✅
**More students?** No problem - everything scales automatically! 🎉
