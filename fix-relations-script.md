# Quick Reference for Relation Fixes

The API returns data with PascalCase relations:
- `slot.Rink` not `slot.rink`
- `slot.Lesson` not `slot.lessons`  
- `lesson.Student` not `lesson.student`
- `student.User` not `student.user`

Files that need updating:
1. TimeSlotDialog.tsx - ✅ In progress
2. ManageTimeSlotDialog.tsx - ✅ Fixed
3. TimeSlotListItem.tsx - Needs reverting
4. Update the interfaces in the components to match API data

The key fix is to ensure extendedProps uses PascalCase consistently.