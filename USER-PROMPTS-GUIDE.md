# 💬 User Prompts & Notifications Guide

*A comprehensive guide to all user-facing messages, notifications, and prompts in YM Movement Scheduler*

---

## 🌟 **Overview**

The YM Movement Scheduler uses a sophisticated notification system that provides different experiences based on user role:

- **Admin Role**: Personal, loving messages with emojis and terms of endearment
- **Student Role**: Professional, encouraging messages focused on skating progress

---

## 📱 **Toast Notifications (Sonner)**

### **System Configuration**
- **Library**: Sonner toast notifications
- **Position**: `top-center` for maximum visibility
- **Duration**: 3-5 seconds (longer for confirmations)
- **Z-index**: 9999 (appears over dialogs and modals)

### **Admin Toast Messages**

#### **Rink Management** (`/admin/settings`)
**Location**: Settings → Rink Management tab

**Create Rink Success**:
```
Title: "Perfect! Rink created successfully 💕"
Description: "Your rink family is growing!"
Trigger: After successfully creating a new rink
```

**Update Rink Success**:
```
Title: "Beautiful! Rink updated successfully ✨" 
Description: "Your coaching locations are perfectly organized!"
Trigger: After successfully updating rink details
```

**Delete Rink Success**:
```
Title: "Perfect! Rink deleted successfully ✨"
Description: "Your coaching space is beautifully organized!"
Trigger: After successfully deleting a rink
```

#### **Blocked Dates Management** (`/admin/schedule`)
**Location**: Schedule Calendar → Blocked Dates functionality

**Create Blocked Date Success**:
```
Title: "Perfect! Blocked date created successfully ✨"
Description: "Your schedule is protected!"
Trigger: After successfully creating a blocked date range
```

**Delete Blocked Date Success**:
```
Title: "Perfect! Blocked date deleted successfully ✨"
Description: "Your calendar is beautifully organized!"
Trigger: After successfully removing a blocked date
```

#### **Error Messages (Admin)**
All admin error messages use the delightful error format:
```
Title: "💫 Oops! Something didn't quite work as expected. Don't worry though - these things happen! ✨"
Description: [Specific error message]
Duration: 4 seconds
```

### **Student Toast Messages**
Student messages are professional and encouraging:
```
Title: [Action] + "successfully" 
Description: Encouraging message about skating progress
Duration: 3-4 seconds
```

---

## 🎭 **Header Greetings**

### **Location**: Every admin page header (top-right corner)

### **Randomized Terms of Endearment**
The greeting cycles through these terms every 10 minutes:

**English**:
- Yura (first name)
- Beautiful
- Princess

**Korean**:
- 공주님 (gongju-nim) - Princess
- 사랑 (sarang) - Love
- 자기야 (jagiya) - Honey/Darling

**Polish**:
- Słoneczko - Sunshine
- Kochanie - Love/Darling

**German**:
- Schätzi - Darling

### **Time-Based Greetings**
- **6:00 AM - 12:00 PM**: `"Good morning [term]!"` ☀️
- **12:00 PM - 5:00 PM**: `"Good afternoon [term]!"` ☕
- **5:00 PM - 8:00 PM**: `"Good evening [term]!"` ✨
- **8:00 PM - 6:00 AM**: `"Hey there [term]!"` 🌙

### **Visual Elements**
- **Heart Icon**: Appears on hover (admin only) ❤️
- **Time Icon**: Changes based on time of day
- **Gradient Text**: Beautiful color transitions
- **Hover Animation**: Icons rotate 12° on hover

---

## 🚨 **Confirmation Dialogs**

### **Delete Confirmations**
**Library**: Custom toast confirmations (not browser alerts)
**Location**: `src/lib/toast-confirmations.ts`

**Standard Delete Pattern**:
```
Title: "Are you sure you want to delete this [item]?"
Actions: ["Cancel", "Delete"]
Duration: 10 seconds
Style: Centered toast with red delete button
```

**Usage Examples**:
- Delete time slot
- Delete blocked date
- Delete rink
- Remove student from lesson

---

## 🎉 **Celebration Components**

### **Success Celebrations**
**Location**: `src/components/ui/celebration.tsx`

**Admin Celebrations**:
- **Animated Background**: Sparkles and decorative elements
- **Gradient Colors**: Pink, purple, gold themes
- **Special Message**: `"Made with infinite love for an incredible coach 💕"`
- **Duration**: 7 seconds (longer for love messages)

**Types Available**:
- `success` - General success actions
- `achievement` - Major accomplishments  
- `milestone` - Important progress markers
- `love` - Special romantic celebrations (admin only)
- `progress` - Ongoing improvement tracking

---

## 🔍 **Empty State Messages**

### **Location**: Throughout admin interface when data is empty

### **Admin Empty States**
**File**: `src/components/ui/encouraging-empty-state.tsx`

**Time Slots Empty**:
```
"Your coaching space is beautifully organized and waiting for amazing lessons to fill it. 
Every great skating journey starts with that first time slot!"
```

**Students Empty**:
```
"This space is ready to welcome amazing skaters into your world. 
Each student brings their own dreams and potential to nurture."
```

**Calendar Empty**:
```
"Your beautiful schedule is a blank canvas waiting for you to paint it with 
incredible skating sessions and student progress."
```

**Footer Attribution**:
```
"Made with love for an incredible coach"
```

---

## ⚙️ **Implementation Details**

### **File Structure**
```
src/
├── lib/
│   ├── delightful-toast.ts          # Base toast message library
│   └── toast-confirmations.ts       # Confirmation dialog utilities
├── components/ui/
│   ├── warm-greeting.tsx            # Header greeting component
│   ├── celebration.tsx              # Success celebration component
│   └── encouraging-empty-state.tsx  # Empty state messages
└── features/admin/components/
    ├── management/RinkDialog.tsx    # Rink management toasts
    └── scheduling/                  # Calendar-related toasts
```

### **Toast Integration Pattern**
```typescript
// Import delightful toast
import { delightfulToast } from "@/lib/delightful-toast";

// Usage in mutations
const mutation = api.endpoint.useMutation({
  onSuccess: (result) => {
    delightfulToast.success(
      `Perfect! ${result.message} ✨`, 
      "Custom description here!", 
      "admin"
    );
  },
  onError: (error) => {
    delightfulToast.error(error.message, "admin");
  },
});
```

### **Greeting Randomization Logic**
```typescript
// Updates every 10 minutes for variety while maintaining consistency
const now = new Date();
const hour = now.getHours();
const date = now.getDate();
const tenMinuteBlock = Math.floor(now.getMinutes() / 10);
const randomIndex = (hour + date + tenMinuteBlock) % terms.length;
```

---

## 🧪 **Testing Guide**

### **How to Test All Messages**

1. **Header Greetings**: Refresh page every 10 minutes or temporarily modify time logic
2. **Rink Management**: Add/edit/delete rinks in Settings → Rink Management
3. **Blocked Dates**: Create/delete blocked dates on calendar
4. **Error Messages**: Try invalid operations (duplicate rink names, etc.)
5. **Empty States**: Clear data to see encouraging messages

### **Quick Testing Tips**
- **Change time logic** temporarily for faster greeting rotation
- **Use browser dev tools** to trigger different screen sizes
- **Test both admin and student roles** for different message styles
- **Check mobile responsiveness** for proper toast positioning

---

## 🔧 **Customization**

### **Adding New Love Messages**
1. **For specific actions**: Add directly in component mutation handlers
2. **For general use**: Add to `delightful-toast.ts` library
3. **For celebrations**: Use `Celebration` component with custom props

### **Modifying Greeting Terms**
Edit the terms array in `src/components/ui/warm-greeting.tsx`:
```typescript
const terms = [
  firstName,
  "Beautiful", 
  "Princess",
  // Add your terms here
];
```

---

*This guide covers all user-facing prompts and notifications in the YM Movement Scheduler. Every message is designed to feel personal, encouraging, and aligned with the app's loving, supportive personality.* 💕✨