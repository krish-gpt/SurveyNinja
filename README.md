# FormPulse - Modern Form Building & Response Collection Platform

FormPulse is a comprehensive form building application similar to Jotform that allows users to create, share, and analyze form responses with an intuitive drag-and-drop interface and powerful analytics.

![FormPulse Logo](https://example.com/logo.png)

## Product Requirements

### Business Requirements
- Create a survey/form builder application similar to Jotform, Google Forms or Typeform
- Implement tiered pricing with subscription management (free vs paid plans)
- Enable form sharing through public links without requiring respondent login
- Store form responses in a database for analysis and export
- Enforce usage limits based on subscription tier
- Support for multiple form question types with validation

### User Stories
- **As a user**, I want to register and login to create forms
- **As a user**, I want to build forms using a drag-and-drop interface
- **As a user**, I want to share my forms with others via a link
- **As a user**, I want to collect and view responses to my forms
- **As a user**, I want to upgrade to a paid plan to access more features
- **As a user**, I want to customize the appearance of my forms
- **As a respondent**, I want to fill out forms without needing to create an account

### Subscription Plans
1. **Free Plan**:
   - Maximum 10 forms per user
   - Maximum 10 responses per form
   - Basic form elements only
   - No custom branding

2. **Premium Plan** ($10/month):
   - Maximum 1000 forms per user
   - Maximum 2000 responses per form
   - All form elements including advanced ones
   - Custom branding options
   - Data export functionality
   - Enhanced analytics

### Form Elements
- Short text fields
- Long text areas
- Multiple choice questions
- Checkboxes
- Dropdown menus
- Rating scales
- Date pickers
- File upload fields

### Technical Requirements
- Responsive design working on mobile and desktop
- Secure data storage with PostgreSQL
- Payment processing via Stripe
- Easy-to-use API for potential future integrations
- Real-time form validation
- Cross-browser compatibility

## Features

### Form Building
- **Drag-and-Drop Interface**: Intuitive form builder with drag-and-drop functionality
- **Multiple Question Types**: Support for text, multiple choice, checkboxes, dropdown, rating, date, and file upload
- **Form Logic**: Set up conditional logic (coming soon)
- **Design Customization**: Customize form appearance and branding (coming soon)

### User Management
- **User Authentication**: Secure registration and login system
- **Subscription Plans**: Free and paid subscription tiers
  - Free: 10 forms with 10 responses each
  - Premium ($10/month): 1000 forms with 2000 responses

### Response Collection & Analysis
- **Public Form Links**: Share forms via unique links
- **Response Storage**: Securely store and organize form responses
- **Analytics Dashboard**: Visualize response data (coming soon)
- **Export Options**: Export responses as CSV or PDF (coming soon)

### Payment Processing
- **Stripe Integration**: Secure payment processing for subscriptions
- **Plan Management**: Automatic subscription handling with user limits

## Tech Stack

### Frontend
- **React**: Frontend framework
- **TypeScript**: Type-safe JavaScript
- **TailwindCSS**: Utility-first CSS framework
- **ShadCN UI**: Component library built on Radix UI
- **Tanstack Query**: Data fetching and caching
- **Zod**: Schema validation
- **Wouter**: Lightweight routing

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web server framework
- **PostgreSQL**: Relational database
- **Drizzle ORM**: Type-safe SQL query builder
- **Passport.js**: Authentication middleware

### Payment Processing
- **Stripe**: Payment processing and subscription management

### Deployment & Infrastructure
- **Replit**: Hosting and deployment platform

## Implementation Status

### Completed Features
- ✅ User authentication (registration, login, password reset)
- ✅ PostgreSQL database integration 
- ✅ Drag-and-drop form builder with multiple field types
- ✅ Form saving and management
- ✅ Stripe subscription integration with tiered plans
- ✅ Response collection and storage
- ✅ Public form sharing

### In Progress
- 🔄 Form analytics dashboard
- 🔄 Response export functionality
- 🔄 Form design customization
- 🔄 Conditional logic for forms

### Future Enhancements
- 📅 Team collaboration features
- 📅 Advanced form templates
- 📅 Webhook integrations
- 📅 API for third-party applications
- 📅 Multi-language support

## Environment Variables

The application requires the following environment variables:

```
# Authentication
SESSION_SECRET=your_session_secret

# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_PRICE_ID=your_stripe_price_id
```

## Getting Started

### Prerequisites
- Node.js (v14+)
- PostgreSQL database
- Stripe account

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables (see above)
4. Run database migrations:
   ```
   npm run db:push
   ```
5. Start the development server:
   ```
   npm run dev
   ```

## Project Structure

```
├── client                 # Frontend code
│   ├── src
│   │   ├── components     # Reusable UI components
│   │   ├── hooks          # Custom React hooks
│   │   ├── lib            # Utility functions
│   │   ├── pages          # Page components
│   │   └── App.tsx        # Main application component
├── server                 # Backend code
│   ├── auth.ts            # Authentication logic
│   ├── db.ts              # Database connection
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Data storage logic
│   └── stripe.ts          # Stripe integration
├── shared                 # Shared code between frontend and backend
│   └── schema.ts          # Database schema and types
└── drizzle.config.ts      # Drizzle ORM configuration
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Replit](https://replit.com/) for hosting and deployment
- [Stripe](https://stripe.com/) for payment processing
- [TailwindCSS](https://tailwindcss.com/) for styling
- [ShadCN UI](https://ui.shadcn.com/) for UI components