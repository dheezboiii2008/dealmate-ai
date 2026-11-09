# DealMate AI

A Next.js starter for email/password accounts, AI-assisted buyer/vendor negotiation, and PayPal checkout-link creation.

## Important status
This is a deployable starter, not a live hosted service. A public URL requires your GitHub/Vercel accounts and environment secrets. Do not use real payments until the app has been security-reviewed and tested.

## Features
- Buyer/vendor registration UI and email/password login API backed by Supabase Auth.
- AI negotiation endpoint using the OpenAI API.
- PayPal Orders API creates a payer-approval checkout URL after an agreement.
- Responsive dashboard UI.

## Setup
1. Create a Supabase project. In Authentication, enable email/password and configure email confirmation. Copy the project URL and anon key; obtain the service-role key from project settings.
2. Create OpenAI API credentials.
3. Create a PayPal developer app. Start with Sandbox credentials.
4. Copy `.env.example` to `.env.local` and fill in all values. Set `NEXT_PUBLIC_APP_URL` to your deployed URL when deploying.
5. Run `npm install` then `npm run dev`.
6. Open http://localhost:3000.

## Deploy and connect GitHub
- Import this repository into Vercel.
- Add the environment variables in Vercel Project Settings → Environment Variables.
- Deploy. Vercel will automatically redeploy on future pushes to the connected branch.

## Security work required before production
- The starter auth route uses Supabase's admin API for registration and a direct password sign-in check; it does not yet issue a browser session cookie. Replace this with Supabase SSR sign-up/sign-in and server-side session validation before exposing user-specific data.
- Add authorization, rate limits, CSRF protections, audit logs, and persistent negotiation/contract/order records.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY`, PayPal secret, or OpenAI key in browser code.
- Require both buyer and vendor to explicitly accept final terms before payment.
- Verify PayPal webhook events and capture orders server-side. Do not trust a browser redirect as proof of payment.
- PayPal Orders/Payouts are not an escrow product. Confirm PayPal product availability, country eligibility, currency and compliance requirements. Milestone escrow/release needs a supported escrow/custody arrangement and legal review.
- This starter creates a PayPal order and returns the payer approval link; it does not capture payment or release milestone payouts automatically.
- The demo negotiation flow is not a legally binding contract. Add a reviewed contract template and explicit signatures/acceptance.

## Environment variables
See `.env.example`.