# Quick Test Script for Resolve Functionality

## Option 1: Create Duel with Past Deadline
1. Go to `/create` page
2. Fill out the form
3. In the deadline datetime-local input, set a date/time in the past
4. Create the duel
5. Visit the duel detail page - you should see "Resolve Duel" button

## Option 2: Update Existing Duel via MongoDB

### Using MongoDB Compass or CLI:

```javascript
// Connect to your MongoDB database
use predictduel  // or your database name

// Find a duel you created
db.duels.find({ status: "active" })

// Update the deadline to 1 hour ago
db.duels.updateOne(
  { _id: ObjectId("YOUR_DUEL_ID") },
  { $set: { deadline: new Date(Date.now() - 3600000) } }
)
```

### Using MongoDB Shell:
```bash
mongosh
use predictduel
db.duels.updateOne(
  { status: "active" },
  { $set: { deadline: new Date(Date.now() - 3600000) } }
)
```

## Option 3: Temporarily Modify Code (For Testing Only)

In `app/api/duels/[id]/resolve/route.ts`, temporarily comment out the deadline check:

```typescript
// Temporarily disable deadline check for testing
// if (now < new Date(duel.deadline)) {
//   return NextResponse.json(
//     { error: 'Cannot resolve duel before deadline' },
//     { status: 400 }
//   )
// }
```

**Remember to uncomment this after testing!**

## Testing Steps:
1. Create or modify a duel so deadline has passed
2. Make sure you're logged in as the creator
3. Visit the duel detail page (`/duel/[id]`)
4. You should see "Resolve Duel" button
5. Click it, select YES or NO, and confirm
6. Check that:
   - Duel status changes to "resolved"
   - Outcome is displayed
   - Participants show won/lost badges
   - User stats are updated

