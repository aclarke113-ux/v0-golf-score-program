# Push Notifications Setup Guide

This guide will help you enable lock screen and banner push notifications for your golf tournament app.

## Step 1: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for web push notifications.

### Option A: Use the included script

Run the following command in your terminal:

\`\`\`bash
node scripts/generate-vapid-keys.js
\`\`\`

This will output two keys:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Public key (safe to expose to clients)
- `VAPID_PRIVATE_KEY` - Private key (keep secret on server)

### Option B: Use web-push CLI

If you have web-push installed globally:

\`\`\`bash
npx web-push generate-vapid-keys
\`\`\`

## Step 2: Add Environment Variables

1. In your v0 project, click on **Vars** in the left sidebar
2. Add the following environment variables with the keys you generated:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = your public key
   - `VAPID_PRIVATE_KEY` = your private key

**Important:** Make sure to use the exact variable names above.

## Step 3: Deploy Your App

After adding the environment variables, redeploy your app to activate push notifications.

## Step 4: Enable Notifications (Users)

Users need to enable push notifications from their device:

1. Open the app in Safari on iOS or Chrome on Android
2. Go to Settings or Profile
3. Find the "Push Notifications" section
4. Click "Enable Push Notifications"
5. Grant permission when prompted

### For iOS Users (Important!)

To receive lock screen notifications on iOS:
1. Open the app in Safari
2. Tap the **Share** button
3. Select **Add to Home Screen**
4. Open the app from your home screen (not Safari)
5. Enable push notifications from within the app

The app must be added to the home screen for push notifications to work on iOS.

## What Gets Notified

Once enabled, users will receive lock screen/banner notifications for:
- Achievement posts (birdies, eagles, holes-in-one)
- Tee time reminders
- Important tournament updates
- Chat messages (if implemented)

## Troubleshooting

### Notifications not working?
- Check that VAPID keys are correctly added in Vars section
- Ensure the app is deployed after adding environment variables
- On iOS, make sure the app is added to home screen
- Check browser permissions: Settings → Site Settings → Notifications

### Still having issues?
Check the browser console for error messages. Common issues:
- Missing VAPID keys
- Incorrect key format
- Browser doesn't support push notifications
- User denied notification permission
\`\`\`

```tsx file="" isHidden
