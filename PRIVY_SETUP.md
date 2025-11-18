# Privy Authentication Setup

## Getting Started

1. **Create a Privy Account**
   - Go to [https://privy.io](https://privy.io)
   - Sign up for a free account
   - Create a new application

2. **Get Your App ID**
   - In your Privy dashboard, copy your App ID
   - It will look like: `clx1234567890abcdef`

3. **Set Environment Variable**
   - Create a `.env.local` file in the root directory
   - Add your Privy App ID:
   ```
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Run the Development Server**
   ```bash
   npm run dev
   ```

## Features

- **Multiple Login Methods**: Wallet, Email, SMS, Google, Twitter, Discord
- **Embedded Wallets**: Automatically creates wallets for users without one
- **Solana Support**: Works with Solana wallets through Privy
- **Dark Theme**: Matches PredictDuel's design system

## Configuration

The Privy provider is configured in `app/layout.tsx`. You can customize:
- Login methods
- Theme colors
- Logo
- Embedded wallet behavior

## Usage

- Click "Connect Wallet" button to navigate to login page
- Users can sign up with Privy using various methods
- Once authenticated, the wallet address is displayed in the nav bar

