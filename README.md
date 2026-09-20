# Daily Save Wallet

Build a modern, production-quality daily savings / EMI payment web app inspired by the visual language of Apple’s website and PayPal’s web app.

I will upload some reference images/screenshots after this prompt. Use them as visual inspiration only. Do not copy them exactly. Combine the clean Apple aesthetic with PayPal-style financial dashboard UX.

1. CORE CONCEPT

The app helps users save a small amount of money every day toward an EMI/payment goal.

Example:

Product purchased on EMI: ₹450

Savings goal: ₹450

Daily target: ₹15

Duration: 30 days

User saves ₹15 every day

After 30 days: ₹450 saved

Progress should show:

₹225 / ₹450

The application should feel like a digital wallet specifically designed for managing EMI savings.

The user should be able to:

Create a savings goal

Set the total EMI amount

Set the daily contribution

Choose the number of days

Track daily payments

See total amount saved

See remaining amount

See progress percentage

View payment/savings history

Add money/payment for the current day

Edit the goal

Reset/delete a goal

2. DESIGN DIRECTION

Use a combination of:

Apple-inspired design

Extremely clean

Minimal interface

Lots of whitespace

Large typography

Soft rounded corners

Subtle shadows

Smooth animations

Glassmorphism where appropriate

Premium and calm visual hierarchy

San Francisco-style typography / system font

Restrained use of colors

High-quality product imagery

Smooth transitions similar to Apple interfaces

PayPal-inspired financial UX

Clear wallet balance

Financial dashboard layout

Prominent amount displays

Simple transaction history

Strong primary action buttons

Clear payment states

Progress and financial information that is immediately understandable

Do NOT make the application look like a generic banking dashboard.

It should feel more like:

Apple Wallet × Apple.com × PayPal

with a modern SaaS/product feel.

3. MAIN DASHBOARD

The home/dashboard page should be the primary screen.

At the top:

Product Card / Product Image

Display a large product image representing the item purchased on EMI.

Example:

[PRODUCT IMAGE]

Below the image:

Your EMI Goal

₹225 saved of ₹450

Then a progress bar:

██████████░░░░░░░░

50% completed

The product card should have:

Large rounded image

Soft background

Product name

EMI amount

Optional small metadata

Example:

Sony WH-1000XM5

₹450 EMI

30-day savings goal

4. WALLET SECTION

The wallet should be the central feature of the application.

Create a beautiful wallet card similar to a premium digital wallet.

Example:

┌──────────────────────────────┐
│ │
│ EMI WALLET │
│ │
│ ₹225.00 │
│ saved │
│ │
│ Goal ₹450 │
│ ━━━━━━━━━━━━━━━░░░░░ │
│ │
│ 50% complete │
│ │
└──────────────────────────────┘

The wallet should clearly display:

Current Saved Amount

₹225

Goal

₹450

Remaining

₹225

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/16067eb7-2ecf-4db6-b07a-a035d24e8326).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
